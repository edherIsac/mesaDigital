import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  NotFoundException,
  Patch,
  UploadedFile,
  UseInterceptors,
  BadGatewayException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { UsersService } from '../users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersAdminController {
  constructor(private usersService: UsersService, private config: ConfigService) {}

  @Get()
  async list() {
    const users = await this.usersService.findAll();
    return users.map((u: any) => {
      const obj = typeof u.toObject === 'function' ? u.toObject() : u;
      const { password, ...rest } = obj;
      return { ...rest, id: obj._id };
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');

    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    // remove password if present
    const { password, ...rest } = user.toObject();
    return rest;
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    // Allow only roles defined in the UserRole enum
    const allowedRoles = Object.values(UserRole) as string[];
    if (!allowedRoles.includes(dto.role as unknown as string)) {
      throw new BadRequestException(`Invalid role. Allowed roles: ${allowedRoles.join(', ')}`);
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: dto.role,
      active: dto.active ?? true,
    });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateUserDto>) {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');

    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersService.findByEmail(dto.email);
      if (existing) throw new ConflictException('Email already registered');
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.email) updateData.email = dto.email;
    if (dto.role) {
      const allowedRoles = Object.values(UserRole) as string[];
      if (!allowedRoles.includes(dto.role as unknown as string)) {
        throw new BadRequestException(`Invalid role. Allowed roles: ${allowedRoles.join(', ')}`);
      }
      updateData.role = dto.role;
    }
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.active !== undefined) {
      updateData.active = dto.active as any;
    }

    const updated = await this.usersService.update(id, updateData);
    if (!updated) throw new NotFoundException('User not found after update');

    return {
      id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      active: updated.active,
      createdAt: updated.createdAt,
    };
  }

  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    if (!file) throw new BadRequestException('No file uploaded');

    // Configure cloudinary using env or config
    try {
      cloudinary.config({
        cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME') ?? process.env.CLOUDINARY_CLOUD_NAME,
        api_key: this.config.get<string>('CLOUDINARY_API_KEY') ?? process.env.CLOUDINARY_API_KEY,
        api_secret: this.config.get<string>('CLOUDINARY_API_SECRET') ?? process.env.CLOUDINARY_API_SECRET,
      });
    } catch (err) {
      // continue, config may still work via process.env
    }

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'avatars', resource_type: 'image', public_id: `user_${id}_${Date.now()}` },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      // file.buffer is available because we used memoryStorage
      stream.end(file.buffer);
    }).catch((err) => {
      throw new BadGatewayException('Upload failed');
    });

    const url = uploadResult?.secure_url ?? uploadResult?.url ?? null;
    if (!url) throw new BadGatewayException('Upload did not return a URL');

    const updated = await this.usersService.update(id, { avatarUrl: url } as any);
    if (!updated) throw new NotFoundException('User not found after avatar update');

    return { url };
  }
}

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
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersAdminController {
  constructor(private usersService: UsersService) {}

  @Get()
  async list() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    // remove password if present
    const { password, ...rest } = user.toObject();
    return rest;
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    // Only allow creating ADMIN or SUPERVISOR users
    if (dto.role !== UserRole.ADMIN && dto.role !== UserRole.SUPERVISOR) {
      throw new BadRequestException('Only ADMIN or SUPERVISOR roles can be created');
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: dto.role,
    });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateUserDto>) {
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
      if (dto.role !== UserRole.ADMIN && dto.role !== UserRole.SUPERVISOR) {
        throw new BadRequestException('Only ADMIN or SUPERVISOR roles are allowed');
      }
      updateData.role = dto.role;
    }
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.usersService.update(id, updateData);
    if (!updated) throw new NotFoundException('User not found after update');

    return {
      id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt,
    };
  }
}

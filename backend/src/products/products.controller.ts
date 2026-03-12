import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Types } from 'mongoose';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService, private config: ConfigService) {
    try {
      cloudinary.config({
        cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME') ?? process.env.CLOUDINARY_CLOUD_NAME,
        api_key: this.config.get<string>('CLOUDINARY_API_KEY') ?? process.env.CLOUDINARY_API_KEY,
        api_secret: this.config.get<string>('CLOUDINARY_API_SECRET') ?? process.env.CLOUDINARY_API_SECRET,
      });
    } catch {
      // Ignore — may already be configured via env
    }
  }

  private buildCoverUrl(publicId: string | null | undefined, size: number): string | null {
    if (!publicId) return null;
    try {
      return cloudinary.url(publicId, {
        width: size,
        height: size,
        crop: 'fill',
        gravity: 'center',
        quality: 'auto',
        fetch_format: 'auto',
        dpr: 'auto',
      });
    } catch {
      return null;
    }
  }

  private toResponse(p: any, size = 160) {
    const obj = typeof p.toObject === 'function' ? p.toObject() : p;
    const dynamicUrl = this.buildCoverUrl(obj.coverImagePublicId, size);
    return { ...obj, id: obj._id, coverImage: dynamicUrl ?? obj.coverImage ?? null };
  }

  @Get()
  async findAll(@Query('size') size?: string) {
    const products = await this.productsService.findAll();
    const s = Number.parseInt(String(size || ''), 10) || 80;
    return products.map((p: any) => this.toResponse(p, s));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    const product = await this.productsService.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return this.toResponse(product, 400);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateProductDto) {
    const product = await this.productsService.create(dto as any);
    return this.toResponse(product, 400);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    const updated = await this.productsService.update(id, dto as any);
    if (!updated) throw new NotFoundException('Product not found after update');
    return this.toResponse(updated, 400);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    const ok = await this.productsService.remove(id);
    if (!ok) throw new NotFoundException('Product not found');
    return { success: true };
  }

  @Post(':id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  async uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    if (!file) throw new BadRequestException('No file uploaded');

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'products',
          resource_type: 'image',
          public_id: `product_${id}_${Date.now()}`,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      stream.end(file.buffer);
    }).catch(() => {
      throw new BadGatewayException('Image upload failed');
    });

    const url = uploadResult?.secure_url ?? uploadResult?.url ?? null;
    const publicId = uploadResult?.public_id ?? null;
    if (!url) throw new BadGatewayException('Upload did not return a URL');

    const updated = await this.productsService.update(id, {
      coverImage: url,
      coverImagePublicId: publicId,
    } as any);
    if (!updated) throw new NotFoundException('Product not found after image upload');

    return { url };
  }
}

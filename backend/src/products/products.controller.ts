import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
  constructor(private productsService: ProductsService) {}

  @Get()
  async findAll() {
    const products = await this.productsService.findAll();
    return products.map((p: any) => {
      const obj = typeof p.toObject === 'function' ? p.toObject() : p;
      return { ...obj, id: obj._id };
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    const product = await this.productsService.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    const obj = typeof product.toObject === 'function' ? product.toObject() : product;
    return { ...obj, id: obj._id };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateProductDto) {
    const product = await this.productsService.create(dto as any);
    const obj = typeof product.toObject === 'function' ? product.toObject() : product;
    return { ...obj, id: obj._id };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    const updated = await this.productsService.update(id, dto as any);
    if (!updated) throw new NotFoundException('Product not found after update');
    const obj = typeof updated.toObject === 'function' ? updated.toObject() : updated;
    return { ...obj, id: obj._id };
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
}

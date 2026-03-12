import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';
import { Allergen, Category } from '../schemas/product.schema';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  price: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsArray()
  @IsEnum(Category, { each: true })
  @IsOptional()
  categories?: Category[];

  @IsBoolean()
  @IsOptional()
  available?: boolean;

  @IsArray()
  @IsOptional()
  @IsUrl({}, { each: true })
  images?: string[];

  @IsUrl()
  @IsOptional()
  coverImage?: string;

  @IsArray()
  @IsOptional()
  modifiers?: any[];

  @IsNumber()
  @IsOptional()
  menuOrder?: number;

  @IsArray()
  @IsEnum(Allergen, { each: true })
  @IsOptional()
  allergens?: Allergen[];
}

import { IsArray, IsBoolean, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

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

  @IsString()
  @IsOptional()
  category?: string;

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
  tags?: string[];

  @IsArray()
  @IsOptional()
  modifiers?: any[];

  @IsMongoId()
  @IsOptional()
  kdsStationId?: string;

  @IsNumber()
  @IsOptional()
  prepTime?: number;

  @IsBoolean()
  @IsOptional()
  onKds?: boolean;

  @IsNumber()
  @IsOptional()
  menuOrder?: number;

  @IsNumber()
  @IsOptional()
  calories?: number;

  @IsArray()
  @IsOptional()
  allergens?: string[];
}

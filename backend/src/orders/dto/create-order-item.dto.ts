import { IsString, IsNumber, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class CreateModifierDto {
  @IsString()
  name: string;

  @IsNumber()
  @IsOptional()
  priceAdjust?: number;

  @IsNumber()
  @IsOptional()
  qty?: number;
}

export class CreateOrderItemDto {
  @IsOptional()
  @IsString()
  menuItemId?: string;

  @IsString()
  name: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModifierDto)
  @IsOptional()
  modifiers?: CreateModifierDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  stationId?: string;
}

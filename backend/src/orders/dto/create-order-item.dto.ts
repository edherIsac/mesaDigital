import { IsString, IsNumber, IsOptional, ValidateNested, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../order-status.enum';

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

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  stationId?: string;
}

import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

class UpdateSeatDto {
  @IsNumber()
  @IsOptional()
  seatNumber?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}

export class UpdateOrderItemDto extends CreateOrderItemDto {
  @IsString()
  @IsOptional()
  _id?: string;
}

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  total?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  @IsOptional()
  items?: UpdateOrderItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSeatDto)
  @IsOptional()
  seats?: UpdateSeatDto[];
}

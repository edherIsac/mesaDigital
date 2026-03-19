import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { OrderStatus } from '../order-status.enum';

export class UpdateOrderDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  total?: number;
}

import { IsString, IsOptional, IsEnum } from 'class-validator';
import { OrderStatus } from '../order-status.enum';

export class UpdateItemStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  actorId?: string;
}

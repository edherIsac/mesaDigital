import { IsString, IsOptional, IsNumber } from 'class-validator';

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
}

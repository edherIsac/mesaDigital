import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../order-status.enum';
import { CreatePersonDto } from './create-person.dto';

export class UpdateOrderDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  tableId?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  total?: number;

  // legacy `items` removed from schema; use `people` instead

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePersonDto)
  people?: CreatePersonDto[];
}

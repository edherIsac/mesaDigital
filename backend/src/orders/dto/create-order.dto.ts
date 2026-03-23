import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePersonDto } from './create-person.dto';

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  tableId?: string;

  @IsString()
  @IsOptional()
  type?: string;

  // legacy `items` removed from schema; use `people` instead

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePersonDto)
  people?: CreatePersonDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  priority?: string;
}

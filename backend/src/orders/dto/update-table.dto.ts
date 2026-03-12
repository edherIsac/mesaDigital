import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateTableDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsNumber()
  @IsOptional()
  seats?: number;

  @IsString()
  @IsOptional()
  zone?: string;
}

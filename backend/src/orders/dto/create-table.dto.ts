import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateTableDto {
  @IsString()
  label: string;

  @IsNumber()
  @IsOptional()
  seats?: number;

  @IsString()
  @IsOptional()
  zone?: string;
}

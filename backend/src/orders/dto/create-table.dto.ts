import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateTableDto {
  @IsString()
  label: string;

  @IsNumber()
  @IsOptional()
  seats?: number;

  @IsString()
  @IsOptional()
  zone?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  available?: boolean;
}

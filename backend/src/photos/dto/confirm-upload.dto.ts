import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class ConfirmUploadDto {
  @IsString()
  @IsNotEmpty()
  public_id: string;

  @IsString()
  @IsNotEmpty()
  secure_url: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsNumber()
  bytes?: number;
}

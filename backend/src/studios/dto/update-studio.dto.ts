import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateStudioDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  watermarkEnabled?: boolean;
}

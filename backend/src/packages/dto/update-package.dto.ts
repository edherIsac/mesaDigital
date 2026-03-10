import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxPhotos?: number;

  @IsOptional()
  @IsBoolean()
  allowExtraPhotos?: boolean;

  @IsOptional()
  @IsNumber()
  extraPhotoPrice?: number;
}

import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePackageDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  maxPhotos: number;

  @IsOptional()
  @IsBoolean()
  allowExtraPhotos?: boolean;

  @IsOptional()
  @IsNumber()
  extraPhotoPrice?: number;
}

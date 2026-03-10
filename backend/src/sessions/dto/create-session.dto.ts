import {
  IsDateString,
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @IsMongoId()
  packageId: string;

  @IsDateString()
  expiresAt: string;
}

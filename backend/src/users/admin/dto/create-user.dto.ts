import { UserRole } from '../../schemas/user.schema';
import { IsEmail, IsEnum, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

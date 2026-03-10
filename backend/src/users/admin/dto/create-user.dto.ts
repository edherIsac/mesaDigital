import { UserRole } from '../../schemas/user.schema';

export class CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

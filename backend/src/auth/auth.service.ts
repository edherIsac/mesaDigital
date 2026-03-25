import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
    });

    return { id: user._id, name: user.name, email: user.email };
  }

  async login(dto: LoginDto) {
    // Fixed root admin user (hardcoded credentials)
    if (dto.email === 'root@test.com') {
      if (dto.password !== '123.Hola')
        throw new UnauthorizedException('Invalid credentials');

      const payload = {
        sub: 'root',
        email: 'root@test.com',
        role: 'ADMIN',
        name: 'root',
      };
      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          id: 'root',
          name: 'root',
          email: 'root@test.com',
          role: 'ADMIN',
          createdAt: new Date().toISOString(),
          avatarUrl: null,
        },
      };
    }
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        avatarUrl: (user as any).avatarUrl ?? null,
      },
    };
  }
}

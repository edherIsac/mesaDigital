import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  Get,
  Request,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

// Strict limits on auth endpoints to mitigate brute-force attacks
@Throttle({ default: { ttl: 60_000, limit: 5 } })
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: any) {
    const uid = req.user?.userId;
    if (!uid) throw new UnauthorizedException();
    const user = await this.usersService.findById(uid);
    if (!user) throw new NotFoundException('User not found');
    const obj: any = typeof user.toObject === 'function' ? user.toObject() : user;
    const { password, ...rest } = obj;
    return { ...rest, id: obj._id, avatarUrl: rest.avatarUrl ?? null };
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}

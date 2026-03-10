import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionStatusDto } from './dto/update-session-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { StudiosService } from '../studios/studios.service';
import { SessionStatus } from './schemas/session.schema';

@Controller()
export class SessionsController {
  constructor(
    private sessionsService: SessionsService,
    private studiosService: StudiosService,
  ) {}

  // Studio: create session
  @Post('studios/:studioId/sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDIO, UserRole.ADMIN)
  async create(
    @Param('studioId') studioId: string,
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: any,
  ) {
    await this.studiosService.ownerCheck(studioId, user.userId, user.role);
    return this.sessionsService.create(studioId, dto);
  }

  // Studio: get session detail
  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDIO, UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.sessionsService.findById(id);
  }

  // Public: validate access token (10 req/min per IP to prevent enumeration)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Get('sessions/validate')
  validateToken(@Query('token') token: string) {
    return this.sessionsService.validateToken(token);
  }

  // Client: confirm selection (1 confirmation per minute per IP)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('sessions/:sessionId/confirm')
  confirm(
    @Param('sessionId') sessionId: string,
    @Headers('x-access-token') token: string,
  ) {
    return this.sessionsService.confirm(sessionId, token);
  }

  // Studio: list sessions
  @Get('studios/:studioId/sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDIO, UserRole.ADMIN)
  async findByStudio(
    @Param('studioId') studioId: string,
    @Query('status') status: SessionStatus,
    @CurrentUser() user: any,
  ) {
    await this.studiosService.ownerCheck(studioId, user.userId, user.role);
    return this.sessionsService.findByStudio(studioId, status);
  }

  // Studio: update session status
  @Patch('studios/:studioId/sessions/:sessionId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDIO, UserRole.ADMIN)
  async updateStatus(
    @Param('studioId') studioId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionStatusDto,
    @CurrentUser() user: any,
  ) {
    await this.studiosService.ownerCheck(studioId, user.userId, user.role);
    return this.sessionsService.updateStatus(sessionId, dto);
  }
}

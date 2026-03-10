import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StudiosService } from './studios.service';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('studios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDIO, UserRole.ADMIN)
export class StudiosController {
  constructor(private studiosService: StudiosService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.studiosService.findAll(user.userId, user.role);
  }

  @Post()
  create(@Body() dto: CreateStudioDto, @CurrentUser() user: any) {
    return this.studiosService.create(dto, user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudioDto,
    @CurrentUser() user: any,
  ) {
    return this.studiosService.update(id, dto, user.userId, user.role);
  }
}

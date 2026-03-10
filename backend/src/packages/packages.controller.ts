import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { StudiosService } from '../studios/studios.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('studios/:studioId/packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDIO, UserRole.ADMIN)
export class PackagesController {
  constructor(
    private packagesService: PackagesService,
    private studiosService: StudiosService,
  ) {}

  @Get()
  async findAll(@Param('studioId') studioId: string, @CurrentUser() user: any) {
    await this.studiosService.ownerCheck(studioId, user.userId, user.role);
    return this.packagesService.findByStudio(studioId);
  }

  @Post()
  async create(
    @Param('studioId') studioId: string,
    @Body() dto: CreatePackageDto,
    @CurrentUser() user: any,
  ) {
    await this.studiosService.ownerCheck(studioId, user.userId, user.role);
    return this.packagesService.create(studioId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.packagesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string) {
    return this.packagesService.delete(id);
  }
}

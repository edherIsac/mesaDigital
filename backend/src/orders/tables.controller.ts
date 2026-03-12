import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('tables')
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Get()
  async findAll(@Query('q') q?: string): Promise<any[]> {
    const items = await this.tablesService.findAll();
    return items.map((t: any) => ({ ...t, id: t._id }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    const t = await this.tablesService.findById(id);
    const obj = typeof t.toObject === 'function' ? t.toObject() : t;
    return { ...obj, id: obj._id };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateTableDto): Promise<any> {
    const created = await this.tablesService.create(dto as any);
    const obj = typeof created.toObject === 'function' ? created.toObject() : created;
    return { ...obj, id: obj._id };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateTableDto): Promise<any> {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    const updated = await this.tablesService.update(id, dto as any);
    const obj = typeof updated.toObject === 'function' ? updated.toObject() : updated;
    return { ...obj, id: obj._id };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    const ok = await this.tablesService.remove(id);
    return { success: ok };
  }
}

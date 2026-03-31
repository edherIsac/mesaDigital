import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() dto: CreateOrderDto) {
    const actorId = req.user?.userId;
    return this.ordersService.create(dto, actorId);
  }

  @Get()
  findAll(
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAll({ locationId, status });
  }

  @Get('kds')
  findForKDS(@Query('locationId') locationId?: string) {
    return this.ordersService.findForKDS({ locationId });
  }

  @Get('caja')
  findForCaja(@Query('locationId') locationId?: string) {
    return this.ordersService.findForCaja({ locationId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto, @Request() req: any) {
    const actorId = req.user?.userId;
    return this.ordersService.update(id, dto, actorId);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.ordersService.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.ordersService.deleteItem(id, itemId);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id);
  }
}

import { Controller, Post, Body, Get, Query, Param, Patch, Delete } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  findAll(@Query('locationId') locationId?: string, @Query('status') status?: string) {
    return this.ordersService.findAll({ locationId, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(@Param('id') id: string, @Param('itemId') itemId: string, @Body() dto: UpdateItemStatusDto) {
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

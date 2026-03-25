import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Table, TableSchema } from '../orders/schemas/table.schema';
import { Station, StationSchema } from '../orders/schemas/station.schema';
import { KdsDevice, KdsDeviceSchema } from '../orders/schemas/kds-device.schema';
import { Printer, PrinterSchema } from '../orders/schemas/printer.schema';
import { OrderEvent, OrderEventSchema } from '../orders/schemas/order-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Table.name, schema: TableSchema },
      { name: Station.name, schema: StationSchema },
      { name: KdsDevice.name, schema: KdsDeviceSchema },
      { name: Printer.name, schema: PrinterSchema },
      { name: OrderEvent.name, schema: OrderEventSchema },
    ]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { Station, StationSchema } from './schemas/station.schema';
import { KdsDevice, KdsDeviceSchema } from './schemas/kds-device.schema';
import { Printer, PrinterSchema } from './schemas/printer.schema';
import { Table, TableSchema } from './schemas/table.schema';
import { OrderEvent, OrderEventSchema } from './schemas/order-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Station.name, schema: StationSchema },
      { name: KdsDevice.name, schema: KdsDeviceSchema },
      { name: Printer.name, schema: PrinterSchema },
      { name: Table.name, schema: TableSchema },
      { name: OrderEvent.name, schema: OrderEventSchema },
    ]),
  ],
  controllers: [OrdersController, TablesController],
  providers: [OrdersService, TablesService],
  exports: [OrdersService, TablesService],
})
export class OrdersModule {}

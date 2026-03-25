import {
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Table, TableDocument } from '../orders/schemas/table.schema';
import { Station, StationDocument } from '../orders/schemas/station.schema';
import { KdsDevice, KdsDeviceDocument } from '../orders/schemas/kds-device.schema';
import { Printer, PrinterDocument } from '../orders/schemas/printer.schema';
import { OrderEvent, OrderEventDocument } from '../orders/schemas/order-event.schema';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(Station.name) private stationModel: Model<StationDocument>,
    @InjectModel(KdsDevice.name) private kdsDeviceModel: Model<KdsDeviceDocument>,
    @InjectModel(Printer.name) private printerModel: Model<PrinterDocument>,
    @InjectModel(OrderEvent.name) private orderEventModel: Model<OrderEventDocument>,
  ) {}

  // Clear an entire collection by key. Allowed keys are mapped below.
  @Post('db/clear')
  async clearCollection(@Body('collection') collection: string) {
    const key = String(collection || '').toLowerCase().trim();
    const map: Record<string, any> = {
      users: this.userModel,
      orders: this.orderModel,
      products: this.productModel,
      tables: this.tableModel,
      stations: this.stationModel,
      kdsdevices: this.kdsDeviceModel,
      printers: this.printerModel,
      orderevents: this.orderEventModel,
    };

    const model = map[key];
    if (!model) throw new NotFoundException('Unknown collection');

    const res = await model.deleteMany({});
    return { ok: true, deletedCount: res.deletedCount ?? 0 };
  }

  // Reset table occupancy. If tableId provided, reset that table.
  // If onlyIfOrderMissing is true, only reset tables whose currentOrderId has no existing order.
  @Post('tables/reset')
  async resetTables(
    @Body('tableId') tableId?: string,
    @Body('onlyIfOrderMissing') onlyIfOrderMissing?: boolean,
  ) {
    if (tableId) {
      const t = await this.tableModel.findById(tableId).exec();
      if (!t) throw new NotFoundException('Table not found');
      if (onlyIfOrderMissing && t.currentOrderId) {
        const found = await this.orderModel.findById(t.currentOrderId).lean().exec();
        if (found) return { ok: true, updated: 0 };
      }
      t.currentOrderId = null as any;
      t.status = 'available';
      await t.save();
      return { ok: true, updated: 1 };
    }

    if (onlyIfOrderMissing) {
      const candidates = await this.tableModel.find({ currentOrderId: { $ne: null } }).lean().exec();
      let updated = 0;
      for (const c of candidates) {
        try {
          const orderId = (c as any).currentOrderId;
          const exists = await this.orderModel.findById(orderId).lean().exec();
          if (!exists) {
            await this.tableModel.findByIdAndUpdate((c as any)._id ?? c._id, { $set: { currentOrderId: null, status: 'available' } }).exec();
            updated += 1;
          }
        } catch {
          // ignore individual failures
        }
      }
      return { ok: true, updated };
    }

    const res = await this.tableModel.updateMany({ currentOrderId: { $ne: null } }, { $set: { currentOrderId: null, status: 'available' } }).exec();
    // `UpdateWriteOpResult` typings may not include `nModified` depending on mongoose version.
    // Use a safe any-cast to access either `modifiedCount` (newer drivers) or `nModified` (older drivers).
    const updated = (res as any).modifiedCount ?? (res as any).nModified ?? 0;
    return { ok: true, updated };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async create(createDto: CreateOrderDto) {
    const orderNumber = `ODR-${Date.now()}`;
    const now = new Date();

    // Basic totals calculation
    let subtotal = 0;
    // Collect items from top-level items or from seats
    let items = [] as any[];
    if (createDto.items && Array.isArray(createDto.items)) items = items.concat(createDto.items as any[]);
    if ((createDto as any).seats && Array.isArray((createDto as any).seats)) {
      for (const s of (createDto as any).seats) {
        if (s && Array.isArray(s.items)) items = items.concat(s.items as any[]);
      }
    }

    for (const it of items || []) {
      const price = it.unitPrice || 0;
      subtotal += price * (it.quantity || 1);
      if (it.modifiers) {
        for (const m of it.modifiers) subtotal += (m.priceAdjust || 0) * (m.qty || 1);
      }
    }

    const created = await this.orderModel.create({
      orderNumber,
      // locationId is optional now; only set if provided
      ...(createDto.locationId ? { locationId: new Types.ObjectId(createDto.locationId) } : {}),
      tableId: createDto.tableId ? new Types.ObjectId(createDto.tableId) : undefined,
      type: createDto.type || 'dine_in',
      items: items || [],
      seats: (createDto as any).seats || [],
      subtotal,
      tax: 0,
      total: subtotal,
      placedAt: now,
      notes: createDto.notes,
      priority: createDto.priority || 'normal',
    } as Partial<Order>);

    return created;
  }

  async findAll(query: { locationId?: string; status?: string }) {
    const filter: any = {};
    if (query.locationId) filter.locationId = new Types.ObjectId(query.locationId);
    if (query.status) filter.status = query.status;
    return this.orderModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findOne(id: string) {
    const doc = await this.orderModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Order not found');
    return doc;
  }

  async update(id: string, updateDto: UpdateOrderDto) {
    const payload: any = { ...updateDto };

    // If seats provided, compute subtotal from seats' items and flatten to items
    if ((updateDto as any).seats !== undefined) {
      const seats = (updateDto as any).seats || [];
      let subtotal = 0;
      const items: any[] = [];
      for (const s of seats) {
        if (s && Array.isArray(s.items)) {
          for (const it of s.items) {
            items.push(it);
            subtotal += (it.unitPrice ?? 0) * (it.quantity ?? 1);
            if (it.modifiers) {
              for (const m of it.modifiers) subtotal += (m.priceAdjust ?? 0) * (m.qty ?? 1);
            }
          }
        }
      }
      payload.subtotal = subtotal;
      payload.total = subtotal;
      payload.items = items;
    } else if (updateDto.items !== undefined) {
      let subtotal = 0;
      for (const it of updateDto.items) {
        subtotal += (it.unitPrice ?? 0) * (it.quantity ?? 1);
        if (it.modifiers) {
          for (const m of it.modifiers) subtotal += (m.priceAdjust ?? 0) * (m.qty ?? 1);
        }
      }
      payload.subtotal = subtotal;
      payload.total = subtotal;
    }

    const updated = await this.orderModel.findByIdAndUpdate(id, { $set: payload }, { new: true }).exec();
    if (!updated) throw new NotFoundException('Order not found');
    return updated;
  }

  async updateItem(orderId: string, itemId: string, dto: UpdateItemStatusDto) {
    const oid = new Types.ObjectId(orderId);
    const iid = new Types.ObjectId(itemId);

    const update: any = {};
    if (dto.status) update['items.$.status'] = dto.status;
    if (dto.assignedTo) update['items.$.assignedTo'] = new Types.ObjectId(dto.assignedTo);
    if (dto.notes) update['items.$.notes'] = dto.notes;

    const res = await this.orderModel.findOneAndUpdate({ _id: oid, 'items._id': iid }, { $set: update }, { new: true }).exec();
    if (!res) throw new NotFoundException('Order or item not found');
    return res;
  }
}

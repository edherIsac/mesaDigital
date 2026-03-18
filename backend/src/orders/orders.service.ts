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
    // Normalize items: support both `items` (flat) and `people` (comanda style)
    let items = createDto.items || [];
    if ((!items || items.length === 0) && (createDto as any).people) {
      // flatten people -> items
      const people = (createDto as any).people as any[];
      const flat: any[] = [];
      for (const p of people) {
        const orders = p.orders || [];
        for (const o of orders) {
          const mapped = {
            menuItemId: o.menuItemId,
            name: o.name,
            quantity: o.quantity || o.qty || 1,
            unitPrice: o.unitPrice ?? o.price ?? 0,
            modifiers: o.modifiers || [],
            notes: o.notes || o.note || undefined,
            stationId: o.stationId,
          };
          flat.push(mapped);
        }
      }
      items = flat;
    }

    // Basic totals calculation
    let subtotal = 0;
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
      // store people if provided to preserve comanda structure
      ...( (createDto as any).people ? { people: (createDto as any).people } : {} ),
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
    const updated = await this.orderModel.findByIdAndUpdate(id, { $set: updateDto }, { new: true }).exec();
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

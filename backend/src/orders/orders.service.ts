import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Table, TableDocument } from './schemas/table.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
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

    // Build the order document payload once so it can be reused for transactional
    // and non-transactional flows.
    const orderDoc: Partial<Order> = {
      orderNumber,
      ...(createDto.locationId ? { locationId: new Types.ObjectId(createDto.locationId) } : {}),
      tableId: createDto.tableId ? new Types.ObjectId(createDto.tableId) : undefined,
      type: createDto.type || 'dine_in',
      items: items || [],
      ...( (createDto as any).people ? { people: (createDto as any).people } : {} ),
      subtotal,
      tax: 0,
      total: subtotal,
      placedAt: now,
      notes: createDto.notes,
      priority: createDto.priority || 'normal',
    } as Partial<Order>;

    let session: ClientSession | null = null;
    try {
      session = await this.orderModel.db.startSession();
      session.startTransaction();

      const createdDocs = await this.orderModel.create([orderDoc], { session });
      const created = Array.isArray(createdDocs) ? createdDocs[0] : createdDocs;

      if (createDto.tableId) {
        const tId = new Types.ObjectId(createDto.tableId);
        const updatedTable = await this.tableModel
          .findByIdAndUpdate(tId, { $set: { currentOrderId: created._id, status: 'occupied' } }, { new: true, session })
          .exec();
        if (!updatedTable) throw new NotFoundException('Table not found when updating after order create');
      }

      await session.commitTransaction();
      session.endSession();
      return created;
    } catch (err: any) {
      // Clean up session if it was started
      if (session) {
        try {
          await session.abortTransaction();
        } catch (e) {
          // ignore
        }
        try {
          session.endSession();
        } catch (e) {
          // ignore
        }
      }

      // If transactions are not supported on this server (common in local dev single-node),
      // fall back to a best-effort non-transactional flow: create order, then update table.
      const isTransactionNotSupported =
        err && (err.code === 20 || (typeof err.message === 'string' && err.message.includes('Transaction numbers are only allowed')));
      if (isTransactionNotSupported) {
        // Non-transactional create
        const created = await this.orderModel.create(orderDoc as any);
        if (createDto.tableId) {
          const tId = new Types.ObjectId(createDto.tableId);
          try {
            const updatedTable = await this.tableModel
              .findByIdAndUpdate(tId, { $set: { currentOrderId: created._id, status: 'occupied' } }, { new: true })
              .exec();
            if (!updatedTable) {
              // rollback: delete created order
              try {
                await this.orderModel.findByIdAndDelete(created._id).exec();
              } catch (delErr) {
                // log and continue throwing the original error
                console.error('Failed to rollback order after table update failure', delErr);
              }
              throw new NotFoundException('Table not found when updating after order create');
            }
          } catch (upErr) {
            // If updating the table fails, ensure we removed the created order or at least log.
            try {
              await this.orderModel.findByIdAndDelete(created._id).exec();
            } catch (delErr) {
              console.error('Failed to rollback order after table update failure', delErr);
            }
            throw upErr;
          }
        }
        return created;
      }

      throw err;
    }
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

  async deleteItem(orderId: string, itemId: string) {
    const doc = await this.orderModel.findById(orderId).exec();
    if (!doc) throw new NotFoundException('Order not found');

    // Try to remove from top-level items
    let removed = false;
    const itemIndex = doc.items.findIndex((it) => String((it as any)._id) === String(itemId));
    if (itemIndex >= 0) {
      doc.items.splice(itemIndex, 1);
      removed = true;
    }

    // If not found, try to remove from people[].orders
    if (!removed) {
      for (const person of doc.people || []) {
        const idx = (person.orders || []).findIndex((it) => String((it as any)._id) === String(itemId));
        if (idx >= 0) {
          person.orders.splice(idx, 1);
          removed = true;
          break;
        }
      }
    }

    if (!removed) throw new NotFoundException('Order or item not found');

    const calcItemTotal = (it: any) => {
      const qty = it.quantity ?? it.qty ?? 1;
      let s = (it.unitPrice || 0) * qty;
      if (it.modifiers && Array.isArray(it.modifiers)) {
        for (const m of it.modifiers) s += (m.priceAdjust || 0) * (m.qty || 1);
      }
      return s;
    };

    let subtotal = 0;
    for (const it of doc.items || []) subtotal += calcItemTotal(it);
    for (const p of doc.people || []) for (const it of p.orders || []) subtotal += calcItemTotal(it);

    doc.subtotal = subtotal;
    doc.total = subtotal + (doc.tax || 0);

    await doc.save();
    return doc;
  }
}

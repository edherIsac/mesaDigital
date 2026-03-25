import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Table, TableDocument } from './schemas/table.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { OrderStatus } from './order-status.enum';
import { SocketService } from '../socket/socket.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    private readonly socketService: SocketService,
  ) {}

  private rolesForOrderStatus(status?: string) {
    const s = (status || '').toString().toLowerCase();
    switch (s) {
      case String(OrderStatus.ACCEPTED):
      case String(OrderStatus.PREPARING):
        return ['KITCHEN', 'SUPERVISOR'];
      case String(OrderStatus.READY):
        return ['WAITER', 'CASHIER', 'SUPERVISOR'];
      case String(OrderStatus.PACKAGED):
        return ['CASHIER', 'WAITER', 'SUPERVISOR'];
      case String(OrderStatus.SERVED):
      case String(OrderStatus.DELIVERED):
        return ['SUPERVISOR', 'ADMIN'];
      case String(OrderStatus.CANCELLED):
        return ['SUPERVISOR', 'ADMIN', 'WAITER'];
      case String(OrderStatus.COMPLETED):
        return ['ADMIN', 'SUPERVISOR', 'CASHIER'];
      default:
        return ['SUPERVISOR', 'KITCHEN', 'ADMIN'];
    }
  }

  private rolesForItemStatus(status?: string) {
    const s = (status || '').toString().toLowerCase();
    switch (s) {
      case String(OrderStatus.PREPARING):
        return ['KITCHEN', 'SUPERVISOR'];
      case String(OrderStatus.READY):
        return ['WAITER', 'CASHIER'];
      case String(OrderStatus.SERVED):
        return ['SUPERVISOR', 'WAITER'];
      case String(OrderStatus.CANCELLED):
        return ['SUPERVISOR', 'ADMIN'];
      default:
        return ['SUPERVISOR'];
    }
  }

  private notifyOrderEvent(
    order: any,
    eventName: string,
    payload: Record<string, any> = {},
    extraRoles: string[] = [],
  ) {
    try {
      const orderId = String(order._id ?? order.id ?? '');
      const tableId = order.tableId ? String(order.tableId) : undefined;
      const base = { orderId, tableId, ...payload };

      // Compose rooms: specific order/table + role rooms
      const roleRooms = (extraRoles || []).map((r) => `role:${r}`);
      const rooms = [...roleRooms, `order:${orderId}`];
      if (tableId) rooms.push(`table:${tableId}`);

      this.socketService.emitToRooms(eventName, base, rooms);
    } catch (e) {
      console.warn('Failed notifyOrderEvent', e);
    }
  }

  async create(createDto: CreateOrderDto) {
    const orderNumber = `ODR-${Date.now()}`;
    const now = new Date();
    // Normalize input into `people` (preferred)
    let peopleForDoc: any[] | undefined = undefined;
    if (
      (createDto as any).people &&
      Array.isArray((createDto as any).people) &&
      (createDto as any).people.length
    ) {
      peopleForDoc = (createDto as any).people.map((p: any) => ({
        ...p,
        orders: (p.orders || []).map((o: any) => ({
          menuItemId: o.menuItemId,
          name: o.name,
          quantity: o.quantity || o.qty || 1,
          unitPrice: o.unitPrice ?? o.price ?? 0,
          modifiers: o.modifiers || [],
          notes: o.notes || o.note || undefined,
          status: o.status ?? OrderStatus.PENDING,
          stationId: o.stationId,
        })),
      }));
    }

    // Calculate subtotal from peopleForDoc (items were removed from schema)
    let subtotal = 0;
    if (peopleForDoc) {
      for (const p of peopleForDoc) {
        for (const it of p.orders || []) {
          const price = it.unitPrice || 0;
          const qty = it.quantity || it.qty || 1;
          subtotal += price * qty;
          if (it.modifiers && Array.isArray(it.modifiers)) {
            for (const m of it.modifiers)
              subtotal += (m.priceAdjust || 0) * (m.qty || 1);
          }
        }
      }
    }

    // Snapshot table label if a tableId was provided so the order keeps the original table identifier
    let tableLabel: string | undefined = undefined;
    if (createDto.tableId) {
      try {
        const tId = new Types.ObjectId(createDto.tableId);
        const tableDoc = await this.tableModel.findById(tId).exec();
        if (tableDoc && (tableDoc as any).label)
          tableLabel = (tableDoc as any).label;
      } catch (e) {
        console.log('Failed to fetch table label:', e);
        // ignore: we'll attempt to update the table later and surface errors there
      }
    }

    // (peopleForDoc prepared above)

    const orderDoc: Partial<Order> = {
      orderNumber,
      ...(createDto.locationId
        ? { locationId: new Types.ObjectId(createDto.locationId) }
        : {}),
      tableId: createDto.tableId
        ? new Types.ObjectId(createDto.tableId)
        : undefined,
      ...(tableLabel ? { tableLabel } : {}),
      type: createDto.type || 'dine_in',
      ...(peopleForDoc ? { people: peopleForDoc } : {}),
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
          .findByIdAndUpdate(
            tId,
            { $set: { currentOrderId: created._id, status: 'occupied' } },
            { session, returnDocument: 'after' },
          )
          .exec();
        if (!updatedTable)
          throw new NotFoundException(
            'Table not found when updating after order create',
          );
      }

      await session.commitTransaction();
      session.endSession();
      try {
        // Emit a lightweight order-created notification to relevant roles/rooms
        const roles = ['KITCHEN', 'SUPERVISOR', 'ADMIN'];
        this.notifyOrderEvent(
          created,
          'order:created',
          {
            tableLabel: created.tableLabel,
            total: created.total,
            placedAt: created.placedAt,
          },
          roles,
        );
      } catch (e) {
        // non-fatal: do not block order creation on socket errors
        console.warn('Failed to emit order:created', e);
      }
      return created;
    } catch (err: any) {
      // Clean up session if it was started
      if (session) {
        try {
          await session.abortTransaction();
        } catch (e) {
          // ignore
          console.log('Failed to abort transaction:', e);
        }
        try {
          session.endSession();
        } catch (e) {
          // ignore
          console.log('Failed to end session:', e);
        }
      }

      // If transactions are not supported on this server (common in local dev single-node),
      // fall back to a best-effort non-transactional flow: create order, then update table.
      const isTransactionNotSupported =
        err &&
        (err.code === 20 ||
          (typeof err.message === 'string' &&
            err.message.includes('Transaction numbers are only allowed')));
      if (isTransactionNotSupported) {
        // Non-transactional create
        const created = await this.orderModel.create(orderDoc as any);
        if (createDto.tableId) {
          const tId = new Types.ObjectId(createDto.tableId);
          try {
            const updatedTable = await this.tableModel
              .findByIdAndUpdate(
                tId,
                { $set: { currentOrderId: created._id, status: 'occupied' } },
                { returnDocument: 'after' },
              )
              .exec();
            if (!updatedTable) {
              // rollback: delete created order
              try {
                await this.orderModel.findByIdAndDelete(created._id).exec();
              } catch (delErr) {
                // log and continue throwing the original error
                console.error(
                  'Failed to rollback order after table update failure',
                  delErr,
                );
              }
              throw new NotFoundException(
                'Table not found when updating after order create',
              );
            }
          } catch (upErr) {
            // If updating the table fails, ensure we removed the created order or at least log.
            try {
              await this.orderModel.findByIdAndDelete(created._id).exec();
            } catch (delErr) {
              console.error(
                'Failed to rollback order after table update failure',
                delErr,
              );
            }
            throw upErr;
          }
        }
        try {
          const roles = ['KITCHEN', 'SUPERVISOR', 'ADMIN'];
          this.notifyOrderEvent(
            created,
            'order:created',
            {
              tableLabel: created.tableLabel,
              total: created.total,
              placedAt: created.placedAt,
            },
            roles,
          );
        } catch (e) {
          console.warn('Failed to emit order:created', e);
        }
        return created;
      }

      throw err;
    }
  }

  async findAll(query: { locationId?: string; status?: string }) {
    const filter: any = {};
    if (query.locationId)
      filter.locationId = new Types.ObjectId(query.locationId);
    if (query.status) filter.status = query.status;
    return this.orderModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findForKDS(query: { locationId?: string } = {}) {
    const filter: any = {};
    if (query.locationId)
      filter.locationId = new Types.ObjectId(query.locationId);
    // Exclude cancelled and completed (paid) orders
    filter.status = { $nin: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] };

    // Fetch candidates then filter out orders where ALL items are READY (or no items at all).
    // This ensures KDS shows only orders that have at least one item not yet ready.
    const candidates = await this.orderModel
      .find(filter)
      .sort({ placedAt: -1 })
      .lean();
    const isReady = (st?: any) =>
      String(st ?? '').toLowerCase() ===
      String(OrderStatus.READY).toLowerCase();

    const hasPending = (order: any) => {
      // Check people -> orders for any non-ready items
      const people = order.people || [];
      for (const p of people) {
        const porders = p.orders || [];
        for (const it of porders) {
          if (!isReady(it?.status)) return true;
        }
      }

      return false;
    };

    return Array.isArray(candidates)
      ? candidates.filter((o) => hasPending(o))
      : [];
  }

  async findForCaja(query: { locationId?: string } = {}) {
    const filter: any = {};
    if (query.locationId)
      filter.locationId = new Types.ObjectId(query.locationId);

    // For caja we return all orders (no filtering) sorted by most recent
    return this.orderModel.find(filter).sort({ placedAt: -1 }).lean();
  }

  async findOne(id: string) {
    const doc = await this.orderModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Order not found');
    return doc;
  }

  async update(id: string, updateDto: UpdateOrderDto) {
    // If client attempts to add items or people, we need to merge them into
    // the existing order document, recalculate totals and enforce basic
    // status rules (do not allow adding to cancelled/completed orders).
    const doc = await this.orderModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Order not found');
    const oldOrderStatus = doc.status;

    // Small helpers to normalize incoming shapes (clients may send `qty`/`note` or `quantity`/`notes`)
    const getQty = (x: any) => x?.quantity ?? x?.qty ?? 1;
    const getUnitPrice = (x: any) => x?.unitPrice ?? x?.price ?? 0;
    const getNotes = (x: any) => x?.notes ?? x?.note ?? '';

    // Helper to compute item total
    const calcItemTotal = (it: any) => {
      const qty = getQty(it);
      let s = (getUnitPrice(it) || 0) * qty;
      if (it.modifiers && Array.isArray(it.modifiers)) {
        for (const m of it.modifiers) s += (m.priceAdjust || 0) * (m.qty || 1);
      }
      return s;
    };

    // Reject additions when order is in terminal states
    const rawStatus = doc.status;
    if (
      rawStatus === OrderStatus.CANCELLED ||
      rawStatus === OrderStatus.COMPLETED
    ) {
      // Client should not be able to modify cancelled/completed orders
      throw new NotFoundException(
        'Order cannot be modified in its current state',
      );
    }

    // If there are people to add/merge
    if (
      updateDto.people &&
      Array.isArray(updateDto.people) &&
      updateDto.people.length
    ) {
      for (const p of updateDto.people) {
        // If person has an id and exists, merge their orders (avoid duplicating existing items)
        if (p.id) {
          const existing = (doc.people || []).find(
            (x: any) => String(x.id || x._id) === String(p.id),
          );
          if (existing) {
            if (p.orders && Array.isArray(p.orders)) {
              for (const o of p.orders) {
                const existsOrder = (existing.orders || []).some((ex: any) => {
                  const exMenu = ex.menuItemId
                    ? String(ex.menuItemId)
                    : undefined;
                  const oMenu = o.menuItemId ? String(o.menuItemId) : undefined;
                  if (
                    ex._id &&
                    (o as any).id &&
                    String(ex._id) === String((o as any).id)
                  )
                    return true;
                  if (
                    exMenu &&
                    oMenu &&
                    exMenu === oMenu &&
                    ex.name === o.name &&
                    getUnitPrice(ex) === getUnitPrice(o) &&
                    getQty(ex) === getQty(o)
                  )
                    return true;
                  if (
                    ex.name === o.name &&
                    getUnitPrice(ex) === getUnitPrice(o) &&
                    getQty(ex) === getQty(o) &&
                    getNotes(ex) === getNotes(o)
                  )
                    return true;
                  return false;
                });
                if (!existsOrder) {
                  const newOrder = {
                    ...(o as any),
                    status: (o as any).status ?? OrderStatus.PENDING,
                  };
                  existing.orders.push(newOrder);
                }
              }
            }
            // update simple fields if provided
            if (p.name) existing.name = p.name;
            if (typeof p.seat !== 'undefined') existing.seat = p.seat;
            continue;
          }
        }

        // Otherwise, add as a new person entry (ensure orders have default status)
        const newPerson: any = { ...(p as any) };
        if (newPerson.orders && Array.isArray(newPerson.orders)) {
          newPerson.orders = newPerson.orders.map((o: any) => ({
            ...o,
            status: o.status ?? OrderStatus.PENDING,
          }));
        }
        (doc.people as any[]).push(newPerson);
      }
    }

    // Apply other scalar updates (status, notes, total)
    if (typeof updateDto.status !== 'undefined')
      doc.status = updateDto.status as any;
    if (typeof updateDto.notes !== 'undefined') doc.notes = updateDto.notes;

    // Recalculate subtotal/total if people were modified or client did not provide explicit total
    if (updateDto.people && updateDto.people.length) {
      let subtotal = 0;
      for (const p of doc.people || [])
        for (const it of p.orders || []) subtotal += calcItemTotal(it);
      doc.subtotal = subtotal;
      doc.total = subtotal + (doc.tax || 0);
    } else if (typeof updateDto.total !== 'undefined') {
      doc.total = updateDto.total as any;
    }

    await doc.save();
    try {
      // If status changed, emit a specific status.changed event
      if (typeof updateDto.status !== 'undefined' && oldOrderStatus !== doc.status) {
        this.notifyOrderEvent(
          doc,
          'order:status.changed',
          { oldStatus: oldOrderStatus, newStatus: doc.status },
          this.rolesForOrderStatus(doc.status),
        );
      }

      // Emit a general update to interested roles/rooms
      this.notifyOrderEvent(
        doc,
        'order:updated',
        { status: doc.status, tableLabel: doc.tableLabel, total: doc.total },
        this.rolesForOrderStatus(doc.status),
      );
    } catch (e) {
      console.warn('Failed to emit order:updated', e);
    }
    return doc;
  }

  async updateItem(orderId: string, itemId: string, dto: UpdateItemStatusDto) {
    const doc = await this.orderModel.findById(orderId).exec();
    if (!doc) throw new NotFoundException('Order not found');
    const oldOrderStatus = doc.status;
    let found = false;
    let oldItemStatus: any = undefined;
    let oldAssignedTo: any = undefined;
    for (const person of doc.people || []) {
      for (const it of person.orders || []) {
        if (String((it as any)._id) === String(itemId)) {
          // capture previous values
          oldItemStatus = (it as any).status;
          oldAssignedTo = (it as any).assignedTo
            ? String((it as any).assignedTo)
            : undefined;

          if (dto.status) (it as any).status = dto.status;
          if (dto.assignedTo)
            (it as any).assignedTo = new Types.ObjectId(dto.assignedTo);
          if (dto.notes) (it as any).notes = dto.notes;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) throw new NotFoundException('Order or item not found');

    if (dto.status === OrderStatus.PREPARING) {
      const current = doc.status;
      if (
        current !== OrderStatus.PREPARING &&
        current !== OrderStatus.CANCELLED &&
        current !== OrderStatus.COMPLETED
      ) {
        doc.status = OrderStatus.PREPARING as any;
      }
    }

    await doc.save();
    try {
      // If item status changed, notify item-specific rooms/roles and assigned user
      if (dto.status && String(oldItemStatus) !== String(dto.status)) {
        // roles for this item status
        const roles = this.rolesForItemStatus(dto.status as any);
        this.notifyOrderEvent(
          doc,
          'order:item:status.changed',
          { itemId, oldStatus: oldItemStatus, newStatus: dto.status, assignedTo: dto.assignedTo },
          roles,
        );

        // notify assigned user directly if present
        if (dto.assignedTo) {
          try {
            this.socketService.emitToUser(dto.assignedTo, 'order:item:assigned', {
              orderId: String(doc._id),
              itemId,
              assignedTo: dto.assignedTo,
            });
          } catch (e) {
            console.warn('Failed to emit order:item:assigned', e);
          }
        }
      }

      // If overall order status changed (e.g., moved to PREPARING), notify status change
      if (oldOrderStatus !== doc.status) {
        this.notifyOrderEvent(
          doc,
          'order:status.changed',
          { oldStatus: oldOrderStatus, newStatus: doc.status },
          this.rolesForOrderStatus(doc.status),
        );
      }

      // Emit a general order update
      this.notifyOrderEvent(
        doc,
        'order:updated',
        { status: doc.status, tableLabel: doc.tableLabel, total: doc.total },
        this.rolesForOrderStatus(doc.status),
      );
    } catch (e) {
      console.warn('Failed to emit order:updated', e);
    }
    return doc;
  }

  async deleteItem(orderId: string, itemId: string) {
    const doc = await this.orderModel.findById(orderId).exec();
    if (!doc) throw new NotFoundException('Order not found');
    // Remove item from people[].orders (root `items` removed from schema)
    let removed = false;
    for (const person of doc.people || []) {
      const idx = (person.orders || []).findIndex(
        (it) => String((it as any)._id) === String(itemId),
      );
      if (idx >= 0) {
        person.orders.splice(idx, 1);
        removed = true;
        break;
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
    for (const p of doc.people || [])
      for (const it of p.orders || []) subtotal += calcItemTotal(it);

    doc.subtotal = subtotal;
    doc.total = subtotal + (doc.tax || 0);

    await doc.save();
    try {
      // notify item removed
      this.notifyOrderEvent(
        doc,
        'order:item:removed',
        { itemId },
        ['SUPERVISOR', 'KITCHEN', 'WAITER'],
      );

      // Emit a general order update
      this.notifyOrderEvent(
        doc,
        'order:updated',
        { status: doc.status, tableLabel: doc.tableLabel, total: doc.total },
        this.rolesForOrderStatus(doc.status),
      );
    } catch (e) {
      console.warn('Failed to emit order:updated', e);
    }
    return doc;
  }

  async cancelOrder(orderId: string) {
    const oid = new Types.ObjectId(orderId);
    const order = await this.orderModel.findById(oid).exec();
    if (!order) throw new NotFoundException('Order not found');
    const oldStatus = order.status;
    const stRaw = (order.status || '').toString().toLowerCase();
    const normalized: string =
      stRaw === 'canceled' ? OrderStatus.CANCELLED : stRaw;
    if (normalized === OrderStatus.CANCELLED.toString()) return order;

    order.status = OrderStatus.CANCELLED;
    await order.save();

    // If the order is linked to a table, clear the table's currentOrderId and mark it available
    if (order.tableId) {
      try {
        await this.tableModel
          .findByIdAndUpdate(order.tableId, {
            $set: { currentOrderId: null, status: 'available' },
          })
          .exec();
      } catch (e) {
        console.warn('Failed to update table when cancelling order', e);
      }
    }

    try {
      // notify status change
      this.notifyOrderEvent(
        order,
        'order:status.changed',
        { oldStatus, newStatus: order.status },
        this.rolesForOrderStatus(order.status),
      );

      // general update
      this.notifyOrderEvent(
        order,
        'order:updated',
        { status: order.status, tableLabel: order.tableLabel, total: order.total },
        this.rolesForOrderStatus(order.status),
      );
    } catch (e) {
      console.warn('Failed to emit order:updated', e);
    }
    return order;
  }
}

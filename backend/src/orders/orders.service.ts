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
import { Notification } from '../common/interfaces/notification.interface';
import { orderStatusLabel } from '../common/utils/status-labels';

// Strongly-typed local interfaces to avoid excessive `any` casts in this service
interface OrderItemDoc {
  _id?: any;
  menuItemId?: Types.ObjectId | string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  modifiers?: any[];
  notes?: string;
  status?: string;
  stationId?: Types.ObjectId | string;
  prepTimeEstimate?: number;
  startedAt?: Date;
  preparedAt?: Date;
  completedAt?: Date;
  assignedTo?: Types.ObjectId | string;
  priority?: number;
  sequence?: number;
}

interface OrderPerson {
  id?: string;
  name: string;
  orders: OrderItemDoc[];
  seat?: number;
}

// Minimal typed shape for Mongo/Mongoose errors relevant to transaction support checks
interface MongoTransactionError {
  code?: number;
  message?: string;
}

function isMongoTransactionError(e: unknown): e is MongoTransactionError {
  return typeof e === 'object' && e !== null && ('code' in e || 'message' in e);
}

// interface ItemSnapshot {
//   itemId: string;
//   name?: string;
//   menuItemId?: string;
//   quantity?: number;
//   unitPrice?: number;
//   modifiers?: any[];
//   personId?: string;
//   personName?: string;
//   seat?: number;
//   assignedTo?: string | undefined;
//   newStatus?: string;
// }

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
        // Include WAITER so front-of-house updates when order moves to PREPARING
        return ['KITCHEN', 'SUPERVISOR', 'WAITER'];
      case String(OrderStatus.READY):
        // Cashier should not be notified for general READY state; only when sent to caja for payment
        return ['WAITER', 'SUPERVISOR'];
      case String(OrderStatus.PACKAGED):
        // Packaged is a FOH concern but not for cashier unless awaiting payment
        return ['WAITER', 'SUPERVISOR'];
      case String(OrderStatus.SERVED):
      case String(OrderStatus.DELIVERED):
        return ['SUPERVISOR', 'ADMIN'];
      case String(OrderStatus.AWAITING_PAYMENT):
        // Notify cashiers/front-of-house that order awaits payment
        return ['CASHIER', 'WAITER', 'SUPERVISOR'];
      case String(OrderStatus.PAID):
      case String(OrderStatus.COMPLETED):
        // After payment/completion, notify admin/supervisor; cashier does not need further toasts
        return ['ADMIN', 'SUPERVISOR'];
      case String(OrderStatus.CANCELLED):
        return ['SUPERVISOR', 'ADMIN', 'WAITER'];
      default:
        return ['SUPERVISOR', 'KITCHEN', 'ADMIN'];
    }
  }

  private rolesForItemStatus(status?: string) {
    const s = (status || '').toString().toLowerCase();
    switch (s) {
      case String(OrderStatus.PREPARING):
        // Notify kitchen and supervisor, and also the waiter so FOH updates when items enter preparing
        return ['KITCHEN', 'SUPERVISOR', 'WAITER'];
      case String(OrderStatus.READY):
        // Item ready is relevant to waiter/supervisor; cashier should not receive per requirement
        return ['WAITER', 'SUPERVISOR'];
      case String(OrderStatus.SERVED):
        return ['SUPERVISOR', 'WAITER'];
      case String(OrderStatus.CANCELLED):
        return ['SUPERVISOR', 'ADMIN'];
      default:
        return ['SUPERVISOR'];
    }
  }

  /**
   * Helper method to send order-related notifications to appropriate roles
   */
  private notifyOrderEvent(
    event:
      | 'order:created'
      | 'order:updated'
      | 'order:cancelled'
      | 'item:statusChanged',
    data: any,
    status?: string,
  ) {
    // Ensure we have a `newStatus` in the payload for consistent titles/messages
    const effectiveData = { ...(data || {}) };
    if (!effectiveData.newStatus && status) effectiveData.newStatus = status;
    // Add human-friendly Spanish label for status
    if (effectiveData.newStatus) {
      try {
        effectiveData.newStatusLabel = orderStatusLabel(
          effectiveData.newStatus,
        );
      } catch (e) {
        console.warn('Failed to get status label for notification', e);
        effectiveData.newStatusLabel = String(effectiveData.newStatus);
      }
    }

    // Special handling for item-level status changes:
    // - still emit the event to all relevant roles so UIs (KDS) refresh,
    // - but only send the `notification` payload to non-KITCHEN roles (WAITER/SUPERVISOR)
    if (event === 'item:statusChanged') {
      const allRoles = this.rolesForItemStatus(effectiveData.newStatus);

      // Split roles so we don't double-emit: kitchen roles get the event (no toast),
      // other roles get event + notification (toast)
      const kitchenRoles = (allRoles || []).filter(
        (r) => String(r).toUpperCase() === 'KITCHEN',
      );
      const notifyRoles = (allRoles || []).filter(
        (r) => String(r).toUpperCase() !== 'KITCHEN',
      );

      // Emit event payload without toast/notification to kitchen roles (so KDS can refresh)
      if (kitchenRoles.length)
        this.socketService.emitToRoles(kitchenRoles, event, effectiveData);

      // Build notification payload and emit only to roles that should see a toast
      if (notifyRoles.length) {
        const notification: Partial<Notification> = {
          type: 'order',
          title: this.getNotificationTitle(event, effectiveData),
          message: this.getNotificationMessage(event, effectiveData),
          data: effectiveData,
          createdAt: Date.now(),
        };
        this.socketService.emitToRoles(notifyRoles, event, {
          ...effectiveData,
          notification,
        });
      }

      return;
    }
    const roles = status
      ? this.rolesForOrderStatus(status)
      : effectiveData.newStatus
        ? this.rolesForItemStatus(effectiveData.newStatus)
        : ['SUPERVISOR'];

    const notification: Partial<Notification> = {
      type: 'order',
      title: this.getNotificationTitle(event, effectiveData),
      message: this.getNotificationMessage(event, effectiveData),
      data: effectiveData,
      createdAt: Date.now(),
    };

    // Emit specific event to roles with notification in payload
    this.socketService.emitToRoles(roles, event, {
      ...effectiveData,
      notification,
    });
  }

  private getNotificationTitle(event: string, data: any): string {
    switch (event) {
      case 'order:created':
        return data.tableLabel
          ? `Nueva orden - Mesa ${data.tableLabel}`
          : `Nueva orden ${data.orderNumber || ''}`;
      case 'order:updated': {
        // If items/people were added, prefer a summary in the title
        if (
          data.peopleAdded ||
          data.itemsAdded ||
          data.peopleAddedCount ||
          data.itemsAddedCount
        ) {
          const pCount = Number(data.peopleAddedCount || 0);
          const iCount = Number(data.itemsAddedCount || 0);
          const parts: string[] = [];
          if (pCount > 0)
            parts.push(`${pCount} ${pCount === 1 ? 'persona' : 'personas'}`);
          else if (data.peopleAdded) parts.push('nueva(s) persona(s)');
          if (iCount > 0)
            parts.push(`${iCount} ${iCount === 1 ? 'platillo' : 'platillos'}`);
          else if (data.itemsAdded) parts.push('nuevos platillos');
          const summary = parts.length ? parts.join(' y ') : 'nuevos elementos';
          return data.tableLabel
            ? `Mesa ${data.tableLabel}: ${summary}`
            : `Orden ${data.orderNumber || data.orderId}: ${summary}`;
        }
        const statusLabel =
          data.newStatusLabel ?? orderStatusLabel(data.newStatus);
        return data.tableLabel
          ? `Mesa ${data.tableLabel}: ${statusLabel}`
          : `Orden ${data.orderNumber || data.orderId}: ${statusLabel}`;
      }
      case 'order:cancelled':
        return data.tableLabel
          ? `Mesa ${data.tableLabel}: orden cancelada`
          : `Orden ${data.orderNumber || data.orderId} cancelada`;
      case 'item:statusChanged': {
        const tableStr = data?.tableLabel
          ? `Mesa ${data.tableLabel}`
          : data?.tableId
            ? `Mesa ${data.tableId}`
            : undefined;
        const statusLabel =
          data.newStatusLabel ?? orderStatusLabel(data.newStatus);
        if (tableStr)
          return `${data.itemName || 'Item'} — ${tableStr}: ${statusLabel}`;
        return `${data.itemName || 'Item'}: ${statusLabel}`;
      }
      default:
        return 'Notificación';
    }
  }

  private getNotificationMessage(event: string, data: any): string {
    switch (event) {
      case 'order:created':
        return data.tableLabel
          ? `Mesa ${data.tableLabel} - Total: $${data.total?.toFixed(2) || '0.00'}`
          : `Orden para ${data.type || 'llevar'}`;
      case 'order:updated': {
        if (
          data.peopleAdded ||
          data.itemsAdded ||
          data.peopleAddedCount ||
          data.itemsAddedCount
        ) {
          const pCount = Number(data.peopleAddedCount || 0);
          const iCount = Number(data.itemsAddedCount || 0);
          const total = (pCount || 0) + (iCount || 0);
          const verb = total === 1 ? 'Se agregó' : 'Se agregaron';
          const parts: string[] = [];
          if (pCount > 0)
            parts.push(`${pCount} ${pCount === 1 ? 'persona' : 'personas'}`);
          if (iCount > 0)
            parts.push(`${iCount} ${iCount === 1 ? 'platillo' : 'platillos'}`);
          const details = parts.length ? parts.join(' y ') : 'nuevos elementos';
          return `${verb} ${details} a la comanda`;
        }
        const statusLabel =
          data.newStatusLabel ?? orderStatusLabel(data.newStatus);
        return `La orden ha cambiado a estado ${statusLabel}`;
      }
      case 'order:cancelled':
        return data.reason || 'La orden ha sido cancelada';
      case 'item:statusChanged': {
        const tableStr = data?.tableLabel
          ? `Mesa ${data.tableLabel}`
          : data?.tableId
            ? `Mesa ${data.tableId}`
            : undefined;
        const normalized = (data.newStatus || '').toString().toLowerCase();
        const preparingRaw = String(OrderStatus.PREPARING).toLowerCase();
        if (normalized === preparingRaw) {
          if (tableStr)
            return `${data.itemName || 'Un item'} de ${tableStr} se ha comenzado a preparar`;
          return `${data.itemName || 'Un item'} se ha comenzado a preparar`;
        }
        const statusLabel =
          data.newStatusLabel ?? orderStatusLabel(data.newStatus);
        if (tableStr)
          return `${data.itemName || 'Un item'} ahora está ${statusLabel} (${tableStr})`;
        return `${data.itemName || 'Un item'} ahora está ${statusLabel}`;
      }
      default:
        return '';
    }
  }

  async create(createDto: CreateOrderDto, actorId?: string) {
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
    // let peopleCount = 0;
    // let itemsCount = 0;
    if (peopleForDoc) {
      for (const p of peopleForDoc) {
        // peopleCount += 1;
        for (const it of p.orders || []) {
          const price = it.unitPrice || 0;
          const qty = it.quantity || it.qty || 1;
          // itemsCount += qty;
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

    // Record which user placed the order (store as string to avoid cast issues)
    if (actorId) orderDoc.placedBy = String(actorId);

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

      // Notify about new order
      this.notifyOrderEvent(
        'order:created',
        {
          orderId: String(created._id),
          orderNumber: created.orderNumber,
          tableId: created.tableId ? String(created.tableId) : null,
          tableLabel: created.tableLabel,
          total: created.total,
          peopleCount: created.people?.length || 0,
          type: created.type,
        },
        created.status,
      );

      return created;
    } catch (err) {
      // If transactions are not supported on this server (common in local dev single-node),
      // fall back to a best-effort non-transactional flow: create order, then update table.
      const isTransactionNotSupported =
        isMongoTransactionError(err) &&
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

        // Notify about new order (non-transactional path)
        this.notifyOrderEvent(
          'order:created',
          {
            orderId: String(created._id),
            orderNumber: created.orderNumber,
            tableId: createDto.tableId ? String(createDto.tableId) : null,
            tableLabel: tableLabel,
            total: subtotal,
            peopleCount: peopleForDoc?.length || 0,
            type: createDto.type || 'dine_in',
          },
          OrderStatus.PENDING,
        );

        return created;
      }

      throw err;
    } finally {
      if (session) {
        try {
          session.endSession();
        } catch (e) {
          // ignore
          console.warn('Failed to end session', e);
        }
      }
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
    // Exclude cancelled and paid orders from KDS
    filter.status = { $nin: [OrderStatus.CANCELLED, OrderStatus.PAID] };

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

  async update(id: string, updateDto: UpdateOrderDto, actorId?: string) {
    // If client attempts to add items or people, we need to merge them into
    // the existing order document, recalculate totals and enforce basic
    // status rules (do not allow adding to cancelled/completed orders).
    const doc = await this.orderModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Order not found');

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
      rawStatus === OrderStatus.COMPLETED ||
      rawStatus === OrderStatus.PAID
    ) {
      // Client should not be able to modify cancelled/completed/paid orders
      throw new NotFoundException(
        'Order cannot be modified in its current state',
      );
    }

    // Track if items/people were added for notification and counts
    let itemsAdded = false;
    let peopleAdded = false;
    let addedPeopleCount = 0;
    let addedItemsCount = 0;

    // If there are people to add/merge
    // Track counts of newly added people and newly added items for notifications
    // let addedPeopleCount = 0;
    // let addedItemsCount = 0;
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
                  // Mark that items were added so KDS/roles are notified
                  itemsAdded = true;
                  // Count added items (respecting quantity)
                  try {
                    addedItemsCount += Number(getQty(o) || 0);
                  } catch (e) {
                    // ignore
                    console.warn(
                      'Failed to count added items for notification',
                      e,
                    );
                  }
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
          // Count items being added for this new person
          // for (const o of newPerson.orders) addedItemsCount += getQty(o);
          newPerson.orders = newPerson.orders.map((o: any) => ({
            ...o,
            status: o.status ?? OrderStatus.PENDING,
          }));
        }
        (doc.people as any[]).push(newPerson);
        // Mark that a new person was added
        peopleAdded = true;
        addedPeopleCount += 1;
        if (
          newPerson.orders &&
          Array.isArray(newPerson.orders) &&
          newPerson.orders.length
        ) {
          let cnt = 0;
          for (const o of newPerson.orders) {
            try {
              cnt += Number(getQty(o) || 0);
            } catch (e) {
              // ignore
              console.warn('Failed to count added items for notification', e);
            }
          }
          if (cnt > 0) {
            itemsAdded = true;
            addedItemsCount += cnt;
          }
        }
        // addedPeopleCount += 1;
      }
    }

    // Track old status for notification
    const oldStatus = doc.status;

    // Apply other scalar updates (status, notes, total)
    if (typeof updateDto.status !== 'undefined') {
      doc.status = updateDto.status;
      // If order marked as paid, set completion timestamp and record cashier
      if (updateDto.status === OrderStatus.PAID) {
        doc.completedAt = new Date();
        if (actorId) doc.paidBy = String(actorId);
      }
    }
    if (typeof updateDto.notes !== 'undefined') doc.notes = updateDto.notes;

    // Recalculate subtotal/total if people were modified or client did not provide explicit total
    if (updateDto.people && updateDto.people.length) {
      let subtotal = 0;
      for (const p of doc.people || []) {
        for (const it of p.orders || []) subtotal += calcItemTotal(it);
      }
      doc.subtotal = subtotal;
      doc.total = subtotal + (doc.tax || 0);
    } else if (typeof updateDto.total !== 'undefined') {
      doc.total = updateDto.total;
    }

    await doc.save();

    // If the order was reverted from AWAITING_PAYMENT back to PREPARING,
    // instruct any cashier clients that may have this order open to
    // navigate back to the caja list to avoid concurrent edits.
    try {
      const wasAwaiting =
        String(oldStatus || '').toLowerCase() ===
        String(OrderStatus.AWAITING_PAYMENT).toLowerCase();
      const isPreparing =
        String(doc.status || '').toLowerCase() ===
        String(OrderStatus.PREPARING).toLowerCase();
      if (wasAwaiting && isPreparing) {
        this.socketService.emitToRoles(
          ['CASHIER'],
          'order:forceRedirectToCaja',
          {
            orderId: String(doc._id),
          },
        );
      }
    } catch (e) {
      console.warn(
        'Failed to notify cashiers to redirect after reverting order to preparing',
        e,
      );
    }

    // Notify about items/people being added to existing order (for KDS refresh)
    if (itemsAdded || peopleAdded) {
      this.notifyOrderEvent(
        'order:updated',
        {
          orderId: String(doc._id),
          orderNumber: doc.orderNumber,
          tableId: doc.tableId ? String(doc.tableId) : null,
          tableLabel: (doc as any).tableLabel,
          itemsAdded,
          peopleAdded,
          itemsAddedCount: addedItemsCount,
          peopleAddedCount: addedPeopleCount,
        },
        doc.status,
      );
    }

    // If the order was marked as PAID, free the table (archive) so FOH shows it as available
    if (
      typeof updateDto.status !== 'undefined' &&
      doc.status === OrderStatus.PAID &&
      doc.tableId
    ) {
      try {
        await this.tableModel
          .findByIdAndUpdate(doc.tableId, {
            $set: { currentOrderId: null, status: 'available' },
          })
          .exec();
      } catch (e) {
        console.warn('Failed to update table when marking order as paid', e);
      }
    }

    // Notify about order status change if status was updated
    if (
      typeof updateDto.status !== 'undefined' &&
      oldStatus !== updateDto.status
    ) {
      this.notifyOrderEvent(
        'order:updated',
        {
          orderId: String(doc._id),
          orderNumber: doc.orderNumber,
          oldStatus,
          newStatus: updateDto.status,
        },
        updateDto.status,
      );
    }

    return doc;
  }

  async updateItem(orderId: string, itemId: string, dto: UpdateItemStatusDto) {
    const doc = await this.orderModel.findById(orderId).exec();
    if (!doc) throw new NotFoundException('Order not found');
    let found = false;
    let oldItemStatus: string | undefined = undefined;
    let itemName: string | undefined = undefined;

    const people = (doc.people || []) as OrderPerson[];
    for (const person of people) {
      const orders: OrderItemDoc[] = person.orders || [];
      for (const orderItem of orders) {
        if (String(orderItem._id) === String(itemId)) {
          // capture previous values
          oldItemStatus = orderItem.status;
          itemName = orderItem.name;

          // apply updates
          if (dto.status) orderItem.status = dto.status;
          if (dto.assignedTo)
            orderItem.assignedTo = new Types.ObjectId(dto.assignedTo);
          if (dto.notes) orderItem.notes = dto.notes;

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
        current !== OrderStatus.COMPLETED &&
        current !== OrderStatus.PAID
      ) {
        doc.status = OrderStatus.PREPARING;
      }
    }

    await doc.save();

    // Notify about item status change
    if (dto.status && oldItemStatus !== dto.status) {
      this.notifyOrderEvent(
        'item:statusChanged',
        {
          itemId,
          orderId: String(doc._id),
          orderNumber: doc.orderNumber,
          oldStatus: oldItemStatus || 'PENDING',
          newStatus: dto.status,
          itemName,
          assignedTo: dto.assignedTo ? String(dto.assignedTo) : undefined,
          tableId: doc.tableId ? String(doc.tableId) : null,
          tableLabel: (doc as any).tableLabel,
        },
        dto.status,
      );
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

    // Notify about order cancellation
    this.notifyOrderEvent(
      'order:cancelled',
      {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        oldStatus: String(oldStatus),
        reason: undefined,
      },
      OrderStatus.CANCELLED,
    );

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

    return order;
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Table, TableDocument } from './schemas/table.schema';
import { SocketService } from '../socket/socket.service';

function normalizeStatus(s?: string): string | undefined {
  if (!s || typeof s !== 'string') return undefined;
  const st = s.trim().toLowerCase();
  if (st === 'active') return 'available';
  if (st === 'disponible' || st === 'available') return 'available';
  if (st === 'ocupada' || st === 'ocupado' || st === 'occupied')
    return 'occupied';
  if (st === 'reservada' || st === 'reserved') return 'reserved';
  if (st === 'blocked' || st === 'bloqueada' || st === 'bloqueado')
    return 'blocked';
  return st;
}

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);

  constructor(
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    private readonly socketService: SocketService,
  ) {}

  async create(dto: Partial<Table>) {
    const toCreate: any = { ...(dto as any) };
    if (toCreate.status)
      toCreate.status =
        normalizeStatus(String(toCreate.status)) ?? toCreate.status;
    const created = await this.tableModel.create(toCreate);
    return created;
  }

  async findAll() {
    return this.tableModel.find().sort({ label: 1 }).lean();
  }

  async findById(id: string) {
    if (!id || !Types.ObjectId.isValid(id))
      throw new NotFoundException('Table not found');
    const doc = await this.tableModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Table not found');
    return doc;
  }

  async update(id: string, dto: Partial<Table>) {
    if (!id || !Types.ObjectId.isValid(id))
      throw new NotFoundException('Table not found');
    const toSet: any = { ...(dto as any) };

    // Get current table to track status changes
    let oldStatus: string | undefined;
    try {
      const current = await this.tableModel.findById(id).exec();
      oldStatus = current?.status;
    } catch (e) {
      this.logger.warn(`Failed to get current table status: ${e}`);
    }

    if (toSet.status)
      toSet.status = normalizeStatus(String(toSet.status)) ?? toSet.status;
    const updated = await this.tableModel
      .findByIdAndUpdate(id, { $set: toSet }, { returnDocument: 'after' })
      .exec();
    if (!updated) throw new NotFoundException('Table not found after update');

    // Notify about table status change
    if (dto.status && oldStatus !== dto.status) {
      this.notifyTableStatusChange({
        tableId: id,
        tableLabel: updated.label,
        oldStatus: oldStatus || 'unknown',
        newStatus: updated.status || 'unknown',
        currentOrderId: updated.currentOrderId
          ? String(updated.currentOrderId)
          : null,
      });
    }

    return updated;
  }

  async remove(id: string) {
    if (!id || !Types.ObjectId.isValid(id))
      throw new NotFoundException('Table not found');
    const res = await this.tableModel.findByIdAndDelete(id).exec();
    return !!res;
  }

  private notifyTableStatusChange(data: {
    tableId: string;
    tableLabel?: string;
    oldStatus: string;
    newStatus: string;
    currentOrderId?: string | null;
  }) {
    // Notify supervisors and waiters about table status changes
    const roles = ['SUPERVISOR', 'WAITER'];

    this.socketService.emitToRoles(roles, 'table:statusChanged', data);

    // Also send a notification for significant status changes
    if (data.newStatus === 'occupied' || data.newStatus === 'available') {
      const notification = {
        type: 'info' as const,
        title: `Mesa ${data.tableLabel || data.tableId}: ${data.newStatus}`,
        message: `La mesa ${data.tableLabel || ''} ahora está ${data.newStatus}`,
        data,
        createdAt: Date.now(),
      };
      this.socketService.emitToRoles(roles, 'notification', notification);
    }
  }
}

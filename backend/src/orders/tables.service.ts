import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Table, TableDocument } from './schemas/table.schema';

function normalizeStatus(s?: string): string | undefined {
  if (!s || typeof s !== 'string') return undefined;
  const st = s.trim().toLowerCase();
  if (st === 'active') return 'available';
  if (st === 'disponible' || st === 'available') return 'available';
  if (st === 'ocupada' || st === 'ocupado' || st === 'occupied') return 'occupied';
  if (st === 'reservada' || st === 'reserved') return 'reserved';
  if (st === 'blocked' || st === 'bloqueada' || st === 'bloqueado') return 'blocked';
  return st;
}

@Injectable()
export class TablesService {
  constructor(@InjectModel(Table.name) private tableModel: Model<TableDocument>) {}

  async create(dto: Partial<Table>) {
    const toCreate: any = { ...(dto as any) };
    if (toCreate.status) toCreate.status = normalizeStatus(String(toCreate.status)) ?? toCreate.status;
    const created = await this.tableModel.create(toCreate as any);
    return created;
  }

  async findAll() {
    return this.tableModel.find().sort({ label: 1 }).lean();
  }

  async findById(id: string) {
    if (!id || !Types.ObjectId.isValid(id)) throw new NotFoundException('Table not found');
    const doc = await this.tableModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Table not found');
    return doc;
  }

  async update(id: string, dto: Partial<Table>) {
    if (!id || !Types.ObjectId.isValid(id)) throw new NotFoundException('Table not found');
    const toSet: any = { ...(dto as any) };
    if (toSet.status) toSet.status = normalizeStatus(String(toSet.status)) ?? toSet.status;
    const updated = await this.tableModel.findByIdAndUpdate(id, { $set: toSet }, { new: true }).exec();
    if (!updated) throw new NotFoundException('Table not found after update');
    return updated;
  }

  async remove(id: string) {
    if (!id || !Types.ObjectId.isValid(id)) throw new NotFoundException('Table not found');
    const res = await this.tableModel.findByIdAndDelete(id).exec();
    return !!res;
  }
}

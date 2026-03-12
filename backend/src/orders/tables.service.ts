import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Table, TableDocument } from './schemas/table.schema';

@Injectable()
export class TablesService {
  constructor(@InjectModel(Table.name) private tableModel: Model<TableDocument>) {}

  async create(dto: Partial<Table>) {
    const created = await this.tableModel.create(dto as any);
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
    const updated = await this.tableModel.findByIdAndUpdate(id, { $set: dto }, { new: true }).exec();
    if (!updated) throw new NotFoundException('Table not found after update');
    return updated;
  }

  async remove(id: string) {
    if (!id || !Types.ObjectId.isValid(id)) throw new NotFoundException('Table not found');
    const res = await this.tableModel.findByIdAndDelete(id).exec();
    return !!res;
  }
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TableDocument = Table & Document;

@Schema()
export class Table {
  @Prop({ required: true })
  label: string;

  @Prop({ default: 1 })
  seats?: number;

  @Prop()
  zone?: string;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: false })
  currentOrderId?: Types.ObjectId;

  @Prop({ default: 'available', enum: ['available', 'occupied', 'reserved', 'blocked'] })
  status?: string;
}

export const TableSchema = SchemaFactory.createForClass(Table);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TableDocument = Table & Document;

@Schema({ timestamps: true })
export class Table {
  @Prop({ required: true })
  label: string;

  @Prop({ default: 1 })
  seats?: number;

  @Prop()
  zone?: string;

  @Prop({ default: 'ACTIVE' })
  status?: string;

  @Prop({ default: true })
  available?: boolean;

  // timestamps (createdAt / updatedAt) are added by Mongoose when `timestamps: true` is set.
  createdAt?: Date;
  updatedAt?: Date;
}

export const TableSchema = SchemaFactory.createForClass(Table);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TableDocument = Table & Document;

@Schema()
export class Table {
  @Prop({ required: true })
  label: string;

  @Prop({ default: 1 })
  seats?: number;

  @Prop()
  zone?: string;
}

export const TableSchema = SchemaFactory.createForClass(Table);

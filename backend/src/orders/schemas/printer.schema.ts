import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PrinterDocument = Printer & Document;

@Schema()
export class Printer {
  @Prop({ required: true })
  name: string;

  @Prop({ default: 'network' })
  type: string;

  @Prop({ type: Object })
  connection: Record<string, any>;

  @Prop()
  templateId?: string;
}

export const PrinterSchema = SchemaFactory.createForClass(Printer);

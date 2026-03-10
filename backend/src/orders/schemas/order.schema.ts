import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema()
export class Modifier {
  @Prop()
  name: string;

  @Prop({ default: 0 })
  priceAdjust: number;

  @Prop({ default: 1 })
  qty: number;
}

export const ModifierSchema = SchemaFactory.createForClass(Modifier);

@Schema({ _id: true })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: false })
  menuItemId?: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ default: 1 })
  quantity: number;

  @Prop({ default: 0 })
  unitPrice: number;

  @Prop({ type: [ModifierSchema], default: [] })
  modifiers: Modifier[];

  @Prop()
  notes?: string;

  @Prop({ default: 'pending' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Station', required: false })
  stationId?: Types.ObjectId;

  @Prop({ default: 0 })
  prepTimeEstimate?: number;

  @Prop()
  startedAt?: Date;

  @Prop()
  preparedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  assignedTo?: Types.ObjectId;

  @Prop({ default: 0 })
  priority?: number;

  @Prop({ default: 0 })
  sequence?: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ unique: true, index: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Location' })
  locationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Table', required: false })
  tableId?: Types.ObjectId;

  @Prop({ default: 'dine_in' })
  type: string;

  @Prop({ default: 'pending', index: true })
  status: string;

  @Prop({ type: [OrderItemSchema], default: [] })
  items: OrderItem[];

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  tax: number;

  @Prop({ default: 0 })
  total: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop()
  notes?: string;

  @Prop({ default: 'normal' })
  priority?: string;

  @Prop()
  placedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ type: Object, default: {} })
  meta?: Record<string, any>;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderEventDocument = OrderEvent & Document;

@Schema({ timestamps: true })
export class OrderEvent {
  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId: Types.ObjectId;


  @Prop({ required: true })
  eventType: string;

  @Prop({ type: Object })
  payload?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  actorId?: Types.ObjectId;
}

export const OrderEventSchema = SchemaFactory.createForClass(OrderEvent);

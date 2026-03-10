import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type KdsDeviceDocument = KdsDevice & Document;

@Schema()
export class KdsDevice {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  deviceKey: string;

  @Prop({ default: 'screen' })
  type: string;

  @Prop({ type: [Types.ObjectId], ref: 'Station', default: [] })
  stationIds?: Types.ObjectId[];

  @Prop()
  lastSeen?: Date;

  @Prop()
  socketId?: string;

  @Prop({ type: Object, default: {} })
  settings?: Record<string, any>;
}

export const KdsDeviceSchema = SchemaFactory.createForClass(KdsDevice);

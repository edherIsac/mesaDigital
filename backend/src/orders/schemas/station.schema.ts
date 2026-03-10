import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StationDocument = Station & Document;

@Schema()
export class Station {
  @Prop({ required: true })
  name: string;

  @Prop()
  code?: string;

  @Prop({ default: 0 })
  defaultPrepTime?: number;

  @Prop({ type: [Types.ObjectId], ref: 'KDSDevice', default: [] })
  kdsDeviceIds?: Types.ObjectId[];
}

export const StationSchema = SchemaFactory.createForClass(Station);

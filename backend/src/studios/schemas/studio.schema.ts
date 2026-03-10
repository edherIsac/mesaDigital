import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudioDocument = Studio & Document;

@Schema()
export class Studio {
  @Prop({ required: true })
  name: string;

  @Prop()
  logoUrl: string;

  @Prop({ default: false })
  watermarkEnabled: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;
}

export const StudioSchema = SchemaFactory.createForClass(Studio);

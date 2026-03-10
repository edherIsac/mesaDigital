import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PhotoDocument = Photo & Document;

@Schema()
export class Photo {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true, index: true })
  sessionId: Types.ObjectId;

  @Prop({ required: true })
  imageUrl: string;

  @Prop()
  thumbnailUrl: string;

  @Prop()
  cloudinaryPublicId: string;

  @Prop()
  orderNumber: number;

  @Prop({ default: false })
  selected: boolean;

  @Prop()
  selectedAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const PhotoSchema = SchemaFactory.createForClass(Photo);

PhotoSchema.index({ sessionId: 1, selected: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PackageDocument = Package & Document;

@Schema()
export class Package {
  @Prop({ type: Types.ObjectId, ref: 'Studio', required: true, index: true })
  studioId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 1 })
  maxPhotos: number;

  @Prop({ default: false })
  allowExtraPhotos: boolean;

  @Prop({ default: 0 })
  extraPhotoPrice: number;
}

export const PackageSchema = SchemaFactory.createForClass(Package);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop()
  sku?: string;

  @Prop()
  category?: string;

  @Prop({ default: true })
  available?: boolean;

  // Array of image URLs for the menu / gallery
  @Prop({ type: [String], default: [] })
  images?: string[];

  // Optional cover image URL
  @Prop()
  coverImage?: string;

  // Cloudinary public_id for dynamic URL generation
  @Prop()
  coverImagePublicId?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  // Simple modifiers structure: [{ name, price }]
  @Prop({ type: [Object], default: [] })
  modifiers?: Record<string, any>[];

  // KDS-related fields
  @Prop({ type: Types.ObjectId, ref: 'Station' })
  kdsStationId?: Types.ObjectId;

  @Prop({ default: true })
  onKds?: boolean;

  // Estimated prep time in seconds (or minutes depending on app conventions)
  @Prop({ default: 0 })
  prepTime?: number;

  // Menu ordering
  @Prop({ default: 0 })
  menuOrder?: number;

  @Prop()
  calories?: number;

  @Prop({ type: [String], default: [] })
  allergens?: string[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

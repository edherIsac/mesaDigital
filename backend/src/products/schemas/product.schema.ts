import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum Allergen {
  GLUTEN = 'gluten',
  CRUSTACEOS = 'crustaceos',
  HUEVO = 'huevo',
  PESCADO = 'pescado',
  CACAHUETE = 'cacahuete',
  SOJA = 'soja',
  LACTEOS = 'lacteos',
  FRUTOS_CASCARA = 'frutos_cascara',
  APIO = 'apio',
  MOSTAZA = 'mostaza',
  SESAMO = 'sesamo',
  SULFITOS = 'sulfitos',
  ALTRAMUCES = 'altramuces',
  MOLUSCOS = 'moluscos',
}

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

  // Menu ordering
  @Prop({ default: 0 })
  menuOrder?: number;

  @Prop()
  calories?: number;

  @Prop({ type: [String], enum: Object.values(Allergen), default: [] })
  allergens?: Allergen[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

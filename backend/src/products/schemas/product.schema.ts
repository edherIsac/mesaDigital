import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum Category {
  // Antojitos & tortería
  TACOS = 'tacos',
  TORTAS = 'tortas',
  QUESADILLAS = 'quesadillas',
  TAMALES = 'tamales',
  ANTOJITOS = 'antojitos',
  TOSTADAS = 'tostadas',
  GORDITAS = 'gorditas',
  TLAYUDAS = 'tlayudas',
  ENFRIJOLADAS = 'enfrijoladas',
  ENCHILADAS = 'enchiladas',
  // Sopas & caldos
  SOPAS = 'sopas',
  CALDOS = 'caldos',
  POZOLE = 'pozole',
  MENUDO = 'menudo',
  // Carnes & proteínas
  CARNES = 'carnes',
  AVES = 'aves',
  MARISCOS = 'mariscos',
  PESCADOS = 'pescados',
  // Guarniciones & ensaladas
  ENSALADAS = 'ensaladas',
  GUARNICIONES = 'guarniciones',
  ARROCES = 'arroces',
  // Comida internacional
  PIZZAS = 'pizzas',
  HAMBURGUESAS = 'hamburguesas',
  PASTA = 'pasta',
  SUSHI = 'sushi',
  // Desayunos
  DESAYUNOS = 'desayunos',
  HUEVOS = 'huevos',
  HOTCAKES = 'hotcakes',
  // Botanas
  BOTANAS = 'botanas',
  ALITAS = 'alitas',
  NACHOS = 'nachos',
  // Postres & panadería
  POSTRES = 'postres',
  HELADOS = 'helados',
  PASTELES = 'pasteles',
  PANADERIA = 'panaderia',
  DULCES = 'dulces',
  // Bebidas
  BEBIDAS_FRIAS = 'bebidas_frias',
  BEBIDAS_CALIENTES = 'bebidas_calientes',
  JUGOS_LICUADOS = 'jugos_licuados',
  AGUAS_FRESCAS = 'aguas_frescas',
  REFRESCOS = 'refrescos',
  CERVEZAS = 'cervezas',
  VINOS = 'vinos',
  COCTELERIA = 'cocteleria',
  MEZCAL_TEQUILA = 'mezcal_tequila',
  // Especiales
  MENU_INFANTIL = 'menu_infantil',
  MENU_DEL_DIA = 'menu_del_dia',
  COMBOS = 'combos',
  VEGANO = 'vegano',
  SIN_GLUTEN = 'sin_gluten',
}

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

  @Prop({ type: [String], enum: Object.values(Category), default: [] })
  categories?: Category[];

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

  // Simple modifiers structure: [{ name, price }]
  @Prop({ type: [Object], default: [] })
  modifiers?: Record<string, any>[];

  // Menu ordering
  @Prop({ default: 0 })
  menuOrder?: number;

  @Prop({ type: [String], enum: Object.values(Allergen), default: [] })
  allergens?: Allergen[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

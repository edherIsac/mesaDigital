import { Allergen } from '../../../constants/allergens';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  category?: string;
  available?: boolean;
  coverImage?: string | null;
  coverImagePublicId?: string | null;
  images?: string[];
  tags?: string[];
  menuOrder?: number;
  calories?: number;
  allergens?: Allergen[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RawProduct {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  price?: number;
  sku?: string;
  category?: string;
  available?: boolean;
  coverImage?: string | null;
  coverImagePublicId?: string | null;
  images?: string[];
  tags?: string[];
  menuOrder?: number;
  calories?: number;
  allergens?: Allergen[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export function normalizeProduct(raw: RawProduct): Product {
  return {
    id: raw.id ?? raw._id ?? '',
    name: raw.name ?? '',
    description: raw.description,
    price: raw.price ?? 0,
    sku: raw.sku,
    category: raw.category,
    available: raw.available ?? true,
    coverImage: raw.coverImage ?? null,
    coverImagePublicId: raw.coverImagePublicId ?? null,
    images: raw.images ?? [],
    tags: raw.tags ?? [],
    menuOrder: raw.menuOrder ?? 0,
    calories: raw.calories,
    allergens: (raw.allergens ?? []) as Allergen[],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

import { Allergen } from '../../../constants/allergens';
import { Category } from '../../../constants/categories';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  categories?: Category[];
  available?: boolean;
  coverImage?: string | null;
  coverImagePublicId?: string | null;
  images?: string[];
  menuOrder?: number;
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
  categories?: Category[];
  available?: boolean;
  coverImage?: string | null;
  coverImagePublicId?: string | null;
  images?: string[];
  menuOrder?: number;
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
    categories: (raw.categories ?? []) as Category[],
    available: raw.available ?? true,
    coverImage: raw.coverImage ?? null,
    coverImagePublicId: raw.coverImagePublicId ?? null,
    images: raw.images ?? [],
    menuOrder: raw.menuOrder ?? 0,
    allergens: (raw.allergens ?? []) as Allergen[],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

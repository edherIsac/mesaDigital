import api from "../../../api/client";
import { RawProduct, Product, ApiResponse, normalizeProduct } from "./Product.interface";
import { Allergen } from "../../../constants/allergens";
import { Category } from "../../../constants/categories";

export async function fetchProducts(): Promise<Product[]> {
  const res = await api.get<RawProduct[]>("/products");
  const raw: RawProduct[] = res.data ?? [];
  return raw.map(normalizeProduct);
}

export async function fetchProductById(id: string): Promise<Product> {
  const res = await api.get<RawProduct | ApiResponse<RawProduct>>(`/products/${id}`);
  const payload = res.data as RawProduct | ApiResponse<RawProduct> | undefined;
  let raw: RawProduct | undefined;
  if (payload && typeof payload === "object" && "data" in payload) {
    raw = (payload as ApiResponse<RawProduct>).data;
  } else {
    raw = payload as RawProduct | undefined;
  }
  return normalizeProduct(raw ?? {});
}

export interface CreateProductDto {
  name: string;
  price: number;
  description?: string;
  sku?: string;
  categories?: Category[];
  available?: boolean;
  menuOrder?: number;
  calories?: number;
  allergens?: Allergen[];
}

export interface UpdateProductDto {
  name?: string;
  price?: number;
  description?: string;
  sku?: string;
  categories?: Category[];
  available?: boolean;
  coverImage?: string;
  menuOrder?: number;
  calories?: number;
  allergens?: Allergen[];
}

export async function createProduct(body: CreateProductDto): Promise<Product | null> {
  const res = await api.post<RawProduct | ApiResponse<RawProduct>>(`/products`, body);
  const payload = res.data as RawProduct | ApiResponse<RawProduct> | undefined;
  const raw = payload && typeof payload === "object" && "data" in payload
    ? (payload as ApiResponse<RawProduct>).data
    : (payload as RawProduct | undefined);
  return raw ? normalizeProduct(raw) : null;
}

export async function updateProduct(id: string, body: UpdateProductDto): Promise<Product | null> {
  const res = await api.patch<RawProduct | ApiResponse<RawProduct>>(`/products/${id}`, body);
  const payload = res.data as RawProduct | ApiResponse<RawProduct> | undefined;
  const raw = payload && typeof payload === "object" && "data" in payload
    ? (payload as ApiResponse<RawProduct>).data
    : (payload as RawProduct | undefined);
  return raw ? normalizeProduct(raw) : null;
}

export async function uploadProductImage(id: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await api.post(`/products/${id}/image`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const data = res.data as { url?: string; coverImage?: string; data?: { url?: string } };
  return data?.url ?? data?.data?.url ?? data?.coverImage ?? "";
}

export async function deleteProduct(id: string): Promise<boolean> {
  await api.delete(`/products/${id}`);
  return true;
}

export const ProductService = {
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProduct,
};

export default ProductService;

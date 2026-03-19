import { Product } from "../Admin/Products/Product.interface";
import { Mesa } from "../Admin/Mesas/Mesa.interface";

// Representa un ítem dentro de la comanda (una línea)
export interface ComandaItem {
  id: number | string; // id local de la línea (puede ser numérico en UI)
  productId?: string; // id del producto en el catálogo
  product?: Product | null; // referencia opcional al producto
  name: string; // nombre a mostrar
  qty: number; // cantidad pedida
  note?: string; // nota para cocina (Sin cebolla, poco chile...)
  unitPrice: number; // precio unitario (número, sin formato)
  type?: string; // tipo/etiqueta ("platillo", "bebida", ...)
  coverImage?: string | null; // url imagen
  status?: import("../../constants/orderStatus").OrderStatus | string; // estado del ítem (pending, preparing, ready, served, ...)
}

// Representa una persona / asiento dentro de la comanda
export interface ComandaPerson {
  id: number | string;
  name: string;
  seat?: number; // número de asiento opcional
  orders: ComandaItem[]; // líneas asociadas a esta persona
}

// Totales y desglose de la comanda
export interface ComandaTotals {
  subtotal: number; // suma de todas las líneas (qty * unitPrice)
  taxes?: number; // impuestos aplicados (valor absoluto)
  service?: number; // servicio / cargo adicional (valor absoluto)
  discount?: number; // descuentos aplicados (valor absoluto)
  total: number; // subtotal + taxes + service - discount
}

// Estructura principal de la comanda
export interface Comanda {
  id?: string; // id de la comanda (si existe en backend)
  tableId?: string; // id de la mesa
  table?: Mesa | null; // datos de la mesa (opcional)
  people: ComandaPerson[]; // lista de personas / asientos
  totals: ComandaTotals; // totales calculados
  currency?: string; // símbolo o código de moneda (por ej. "$" o "USD")
  status?: "draft" | "open" | "placed" | "paid" | "cancelled" | string;
  createdAt?: string;
  updatedAt?: string;
  notes?: string; // notas generales de la comanda
  metadata?: Record<string, unknown>;
}

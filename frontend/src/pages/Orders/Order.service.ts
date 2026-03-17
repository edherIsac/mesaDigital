import api from "../../api/client";

export interface OrderItem {
  productId?: string;
  quantity?: number;
  notes?: string;
}

export interface CreateOrderDto {
  locationId?: string;
  tableId?: string;
  type?: string;
  items?: OrderItem[];
  notes?: string;
  priority?: string;
}

export async function createOrder(body: CreateOrderDto) {
  const res = await api.post('/orders', body);
  return res.data;
}

const OrderService = { createOrder };
export default OrderService;

import api from "../../api/client";

export interface CreateOrderDto {
  locationId?: string;
  tableId?: string;
  type?: string;
  items?: any[];
  notes?: string;
  priority?: string;
}

export async function createOrder(body: CreateOrderDto) {
  const res = await api.post('/orders', body);
  return res.data;
}

export async function fetchOrders(params?: { locationId?: string; status?: string }) {
  const res = await api.get('/orders', { params });
  return (res.data ?? []) as any[];
}

export async function fetchOrderById(id: string) {
  const res = await api.get(`/orders/${id}`);
  return res.data;
}

export async function updateOrder(id: string, body: any) {
  const res = await api.patch(`/orders/${id}`, body);
  return res.data;
}

const OrderService = { createOrder, fetchOrders, fetchOrderById, updateOrder };
export default OrderService;

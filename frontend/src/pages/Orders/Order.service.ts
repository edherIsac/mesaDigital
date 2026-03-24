import api from "../../api/client";
import { OrderStatus } from "../../constants/orderStatus";
import { Order } from "../../interfaces/Order.interface";

export interface CreateOrderItemDto {
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
  status?: OrderStatus;
}

export interface CreatePersonDto {
  id?: string;
  name: string;
  seat?: number;
  orders?: CreateOrderItemDto[];
}

export interface CreateOrderDto {
  locationId?: string;
  tableId?: string;
  type?: string;
  // items?: CreateOrderItemDto[];
  people?: CreatePersonDto[];
  notes?: string;
  priority?: string;
}

export async function createOrder(body: CreateOrderDto) {
  const res = await api.post<Order>('/orders', body);
  return res.data;
}

export async function getOrder(id: string) {
  const res = await api.get(`/orders/${id}`);
  return res.data;
}

export async function updateOrder(id: string, body: Partial<CreateOrderDto>) {
  const res = await api.patch<Order>(`/orders/${id}`, body);
  return res.data;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const res = await api.patch(`/orders/${id}`, { status });
  return res.data;
}

export async function getOrders(params?: { locationId?: string; status?: string }) {
  const res = await api.get('/orders', { params });
  return res.data;
}

export async function getKDSOrders(params?: { locationId?: string }) {
  const res = await api.get('/orders/kds', { params });
  return res.data;
}

export async function getCajaOrders(params?: { locationId?: string }) {
  const res = await api.get('/orders/caja', { params });
  return res.data;
}

export async function updateOrderItem(
  orderId: string,
  itemId: string,
  body: Partial<{ status?: string; assignedTo?: string; notes?: string }>,
) {
  const res = await api.patch(`/orders/${orderId}/items/${itemId}`, body);
  return res.data;
}

export async function deleteOrderItem(orderId: string, itemId: string) {
  const res = await api.delete(`/orders/${orderId}/items/${itemId}`);
  return res.data;
}

export async function cancelOrder(id: string) {
  const res = await api.patch(`/orders/${id}/cancel`);
  return res.data;
}

const OrderService = { createOrder, getOrder, getOrders, getKDSOrders, getCajaOrders, updateOrder, updateOrderStatus, updateOrderItem, deleteOrderItem, cancelOrder };
export default OrderService;

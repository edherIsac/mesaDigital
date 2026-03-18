import api from "../../api/client";

export interface CreateOrderItemDto {
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
  status?: string;
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
  items?: CreateOrderItemDto[];
  people?: CreatePersonDto[];
  notes?: string;
  priority?: string;
}

export async function createOrder(body: CreateOrderDto) {
  const res = await api.post('/orders', body);
  return res.data;
}

export async function getOrder(id: string) {
  const res = await api.get(`/orders/${id}`);
  return res.data;
}

const OrderService = { createOrder, getOrder };
export default OrderService;

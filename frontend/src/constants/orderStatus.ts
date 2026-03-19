export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export const OrderStatusValues = Object.values(OrderStatus) as string[];

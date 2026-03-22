export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PREPARING = 'preparing',
  ON_HOLD = 'on_hold',
  READY = 'ready',
  PACKAGED = 'packaged',
  DELIVERED = 'delivered',
  SERVED = 'served',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export const OrderStatusValues = Object.values(OrderStatus) as string[];

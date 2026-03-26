export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PREPARING = 'preparing',
  ON_HOLD = 'on_hold',
  READY = 'ready',
  PACKAGED = 'packaged',
  AWAITING_PAYMENT = 'awaiting_payment',
  PAID = 'paid',
  DELIVERED = 'delivered',
  SERVED = 'served',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export const OrderStatusValues = Object.values(OrderStatus);

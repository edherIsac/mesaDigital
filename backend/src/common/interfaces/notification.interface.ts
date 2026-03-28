export interface Notification {
  id?: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'order';
  title: string;
  message?: string;
  data?: unknown;
  read?: boolean;
  createdAt: number;
}

export interface OrderCreatedPayload {
  orderId: string;
  orderNumber: string;
  tableId?: string | null;
  tableLabel?: string;
  total: number;
  peopleCount: number;
  notification: Notification;
}

export interface OrderUpdatedPayload {
  orderId: string;
  orderNumber?: string;
  oldStatus: string;
  newStatus: string;
  notification: Notification;
}

export interface OrderCancelledPayload {
  orderId: string;
  orderNumber?: string;
  reason?: string;
  notification: Notification;
}

export interface ItemStatusChangedPayload {
  itemId: string;
  orderId: string;
  orderNumber?: string;
  oldStatus: string;
  newStatus: string;
  itemName?: string;
  assignedTo?: string;
  notification: Notification;
}

export interface TableStatusChangedPayload {
  tableId: string;
  tableLabel?: string;
  oldStatus: string;
  newStatus: string;
  currentOrderId?: string | null;
}

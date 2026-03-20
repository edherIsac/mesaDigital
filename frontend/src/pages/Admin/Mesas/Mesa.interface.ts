export interface Mesa {
  id: string;
  label: string;
  seats?: number;
  zone?: string;
  createdAt?: string;
  currentOrderId?: string;
  status?: string;
  // The current order's status (if any) fetched for display in maps/UI
  orderStatus?: string;
}

import { OrderStatus } from '../../orders/order-status.enum';

export const normalizeOrderStatus = (s?: string): string => {
  if (!s) return OrderStatus.PENDING;
  const stRaw = String(s).trim().toLowerCase();
  if (stRaw === 'in_progress') return OrderStatus.PREPARING;
  if (stRaw === 'canceled' || stRaw === 'cancelled') return OrderStatus.CANCELLED;
  if (stRaw === 'accepted') return OrderStatus.ACCEPTED;
  if (stRaw === 'on_hold' || stRaw === 'on-hold' || stRaw === 'on hold') return OrderStatus.ON_HOLD;
  if (
    stRaw === 'packaged' ||
    stRaw === 'ready_for_pickup' ||
    stRaw === 'ready-for-pickup' ||
    stRaw === 'ready for pickup'
  )
    return OrderStatus.PACKAGED;
  if (stRaw === 'delivered') return OrderStatus.DELIVERED;
  return stRaw;
};

export const orderStatusLabel = (s?: string): string => {
  const st = normalizeOrderStatus(s);
  if (st === OrderStatus.PENDING) return 'Pendiente';
  if (st === OrderStatus.ACCEPTED) return 'Aceptado';
  if (st === OrderStatus.PREPARING) return 'En preparación';
  if (st === OrderStatus.ON_HOLD) return 'En espera';
  if (st === OrderStatus.READY) return 'Listo';
  if (st === OrderStatus.PACKAGED) return 'Empacado';
  if (st === OrderStatus.SERVED) return 'Servido';
  if (st === OrderStatus.DELIVERED) return 'Entregado';
  if (st === OrderStatus.CANCELLED) return 'Cancelado';
  if (st === OrderStatus.COMPLETED) return 'Completado';
  if (st === OrderStatus.AWAITING_PAYMENT) return 'En espera de pago';
  if (st === OrderStatus.PAID) return 'Pagado';
  return String(st).charAt(0).toUpperCase() + String(st).slice(1);
};

export const tableStatusLabel = (s?: string): string => {
  if (!s) return '';
  const st = String(s).trim().toLowerCase();
  if (st === 'available' || st === 'disponible') return 'Disponible';
  if (st === 'occupied' || st === 'ocupada' || st === 'ocupado') return 'Ocupada';
  if (st === 'reserved' || st === 'reservada') return 'Reservada';
  if (st === 'blocked' || st === 'bloqueada' || st === 'bloqueado') return 'Bloqueada';
  return st.charAt(0).toUpperCase() + st.slice(1);
};

export default {
  normalizeOrderStatus,
  orderStatusLabel,
  tableStatusLabel,
};

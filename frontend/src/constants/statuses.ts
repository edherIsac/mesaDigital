import { OrderStatus } from './orderStatus';

export const normalizeStatus = (s?: string): string => {
  if (!s) return OrderStatus.PENDING;
  const stRaw = s.toString().trim().toLowerCase();
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

export const itemStatusLabel = (s?: string): string => {
  const st = normalizeStatus(s);
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
  return st.charAt(0).toUpperCase() + st.slice(1);
};

export const itemStatusClass = (s?: string): string => {
  const st = normalizeStatus(s);
  switch (st) {
    case OrderStatus.ACCEPTED:
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300';
    case OrderStatus.PREPARING:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
    case OrderStatus.ON_HOLD:
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300';
    case OrderStatus.READY:
    case OrderStatus.PACKAGED:
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
    case OrderStatus.SERVED:
    case OrderStatus.DELIVERED:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700/20 dark:text-gray-200';
    case OrderStatus.CANCELLED:
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
  }
};

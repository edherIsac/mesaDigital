import { OrderStatus } from './orderStatus';

export const normalizeStatus = (s?: string): string => {
  if (!s) return OrderStatus.PENDING;
  const st = s.toString().trim().toLowerCase();
  if (st === 'in_progress') return OrderStatus.PREPARING;
  if (st === 'canceled') return OrderStatus.CANCELLED;
  return st;
};

export const itemStatusLabel = (s?: string): string => {
  const st = normalizeStatus(s);
  if (st === OrderStatus.PENDING) return 'Pendiente';
  if (st === OrderStatus.PREPARING) return 'En preparación';
  if (st === OrderStatus.READY) return 'Listo';
  if (st === OrderStatus.SERVED) return 'Servido';
  if (st === OrderStatus.CANCELLED) return 'Cancelado';
  return st.charAt(0).toUpperCase() + st.slice(1);
};

export const itemStatusClass = (s?: string): string => {
  const st = normalizeStatus(s);
  switch (st) {
    case OrderStatus.PREPARING:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
    case OrderStatus.READY:
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
    case OrderStatus.SERVED:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700/20 dark:text-gray-200';
    case OrderStatus.CANCELLED:
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
  }
};

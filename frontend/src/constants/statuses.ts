export const itemStatusLabel = (s?: string): string => {
  const st = (s ?? 'pending').toString().trim().toLowerCase();
  if (st === 'pending') return 'Pendiente';
  if (st === 'preparing' || st === 'in_progress') return 'En preparación';
  if (st === 'ready') return 'Listo';
  if (st === 'served') return 'Servido';
  if (st === 'cancelled' || st === 'canceled') return 'Cancelado';
  return st.charAt(0).toUpperCase() + st.slice(1);
};

export const itemStatusClass = (s?: string): string => {
  const st = (s ?? 'pending').toString().trim().toLowerCase();
  switch (st) {
    case 'preparing':
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
    case 'ready':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
    case 'served':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700/20 dark:text-gray-200';
    case 'cancelled':
    case 'canceled':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
  }
};

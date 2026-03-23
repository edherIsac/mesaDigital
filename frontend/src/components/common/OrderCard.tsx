import React from 'react';

export type OrderStatus = 'pending' | 'urgent' | 'ready';

export interface OrderCardModel {
  id: string;
  table: string | number;
  people: number;
  total: number;
  placedAt: string | number | Date;
  status: OrderStatus;
}

interface Props {
  order: OrderCardModel;
  onClick?: (id: string) => void;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

const timeAgoShort = (when?: string | number | Date) => {
  if (!when) return '';
  const d = new Date(String(when));
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const statusClasses = (s: OrderStatus) => {
  switch (s) {
    case 'urgent':
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    case 'ready':
      return 'bg-green-50 text-green-700 ring-1 ring-green-200';
    default:
      return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
  }
};

export default function OrderCard({ order, onClick }: Props) {
  const { id, table, people, total, placedAt, status } = order;
  const time = timeAgoShort(placedAt);

  return (
    <div
      role="button"
      onClick={() => onClick && onClick(id)}
      className="h-full flex flex-col rounded-lg bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-transform duration-150 cursor-pointer overflow-hidden"
    >
      <div className={`px-4 py-3 flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="text-xl font-extrabold text-gray-800 dark:text-white/95">{String(table)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{people} comensal{people > 1 ? 'es' : ''}</div>
            {status === 'urgent' && (
              <div className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-semibold">
                ¡Urgente!
              </div>
            )}
          </div>
        </div>

        <div className="text-right min-w-[86px]">
          <div className="text-sm text-gray-500 dark:text-gray-400">{time}</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white/95">{formatCurrency(total)}</div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-2 px-2 py-1 rounded ${statusClasses(status)} text-xs font-medium`}> 
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status === 'urgent' ? '#ef4444' : status === 'ready' ? '#10b981' : '#f59e0b' }} />
            <span className="uppercase tracking-wider">{status === 'ready' ? 'Lista para cobrar' : status === 'urgent' ? 'Urgente' : 'Pendiente'}</span>
          </div>

          <div className="text-xs text-gray-400">Mesa · <span className="text-gray-700 dark:text-white/90">{table}</span></div>
        </div>
      </div>
    </div>
  );
}

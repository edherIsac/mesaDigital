import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageBreadcrumb, PageMeta, OrderCard } from "../../components";
import type { OrderCardModel } from "../../components/common/OrderCard";

const mockOrders: OrderCardModel[] = [
  { id: 'o1', table: 'M5', people: 2, total: 250, placedAt: Date.now() - 2 * 60 * 1000, status: 'pending' },
  { id: 'o2', table: 'M3', people: 4, total: 680, placedAt: Date.now() - 8 * 60 * 1000, status: 'pending' },
  { id: 'o3', table: 'M12', people: 1, total: 120, placedAt: Date.now() - 35 * 60 * 1000, status: 'urgent' },
  { id: 'o4', table: 'M2', people: 3, total: 420, placedAt: Date.now() - 12 * 60 * 1000, status: 'pending' },
  { id: 'o5', table: 'M8', people: 5, total: 980, placedAt: Date.now() - 65 * 60 * 1000, status: 'urgent' },
  { id: 'o6', table: 'M1', people: 2, total: 160, placedAt: Date.now() - 4 * 60 * 1000, status: 'ready' },
  { id: 'o7', table: 'M10', people: 2, total: 310, placedAt: Date.now() - 22 * 60 * 1000, status: 'pending' },
  { id: 'o8', table: 'M7', people: 6, total: 1450, placedAt: Date.now() - 90 * 60 * 1000, status: 'urgent' },
  { id: 'o9', table: 'M4', people: 2, total: 210, placedAt: Date.now() - 6 * 60 * 1000, status: 'pending' },
  { id: 'o10', table: 'M9', people: 3, total: 520, placedAt: Date.now() - 28 * 60 * 1000, status: 'pending' },
  { id: 'o11', table: 'M6', people: 1, total: 95, placedAt: Date.now() - 3 * 60 * 1000, status: 'ready' },
  { id: 'o12', table: 'M11', people: 4, total: 730, placedAt: Date.now() - 15 * 60 * 1000, status: 'pending' },
];

export default function Caja() {
  const dynamicRef = useRef<HTMLDivElement | null>(null);
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (!dynamicRef.current) return;
      const wrapperRect = dynamicRef.current.getBoundingClientRect();
      const avail = window.innerHeight - wrapperRect.top - 24; // keep a small bottom gap
      setDynamicHeight(avail > 0 ? Math.max(avail, 0) : 0);
    };
    update();
    window.addEventListener('resize', update);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro) ro.observe(document.body);
    return () => {
      window.removeEventListener('resize', update);
      if (ro) ro.disconnect();
    };
  }, []);

  const navigate = useNavigate();

  return (
    <div>
      <PageMeta title="Caja | mesaDigital" description="Punto de pago — gestión de pagos y cierre de órdenes" />
      <PageBreadcrumb pageTitle="Caja" />

      <div
        ref={dynamicRef}
        style={dynamicHeight ? { height: `${dynamicHeight}px` } : undefined}
        className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="mb-1 font-semibold text-gray-800 dark:text-white/90 text-2xl">Caja</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Órdenes listas para cobro — revisa y selecciona rápidamente</p>
          </div>
          <div className="text-sm text-gray-500">Total pedidos: <span className="font-medium text-gray-800 dark:text-white/90">{mockOrders.length}</span></div>
        </div>

        <div className="w-full flex-1 min-h-0 overflow-hidden">
          <div
            className="grid gap-4 w-full h-full min-h-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ gridAutoRows: 'minmax(0, 1fr)' }}
          >
            {mockOrders.map((o) => (
              <div key={o.id} className="p-3 h-full min-h-0">
                <OrderCard order={o} onClick={(id) => navigate(`/caja/detalles/${id}`)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


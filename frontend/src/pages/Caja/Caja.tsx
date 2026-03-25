import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageBreadcrumb, PageMeta, OrderCard } from "../../components";
import type { OrderCardModel } from "../../components/common/OrderCard";
import OrderService from "../Orders/Order.service";
import type { Order, Person, OrderItem } from "../../interfaces/Order.interface";
import { useSocket } from '../../hooks/useSocket';

// Orders are loaded from backend /orders/caja

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
  const [orders, setOrders] = useState<OrderCardModel[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { socket } = useSocket();

  useEffect(() => {
    let mounted = true;
    setLoadingOrders(true);
    OrderService.getCajaOrders()
      .then((res: Order[]) => {
        if (!mounted) return;
        const mapped: OrderCardModel[] = (res || []).map((o: Order) => {
          const id = o._id ?? o.id ?? String(Math.random()).slice(2, 9);
          const table = o.tableLabel ?? o.tableId ?? '—';
          const people = Array.isArray(o.people) ? o.people.length : 0;
          const maybeTotal = (o as Record<string, unknown>).total;
          const maybeSubtotal = (o as Record<string, unknown>).subtotal;
          const subtotal = typeof maybeTotal === 'number' && maybeTotal ? maybeTotal : (typeof maybeSubtotal === 'number' ? maybeSubtotal : null);
          const computedTotal = subtotal ?? (Array.isArray(o.people) ? o.people.reduce((s: number, p: Person) => {
            return s + ((p.orders || []).reduce((ss: number, it: OrderItem) => ss + ((it.unitPrice ?? it.price ?? 0) * (it.quantity ?? it.qty ?? 1)), 0));
          }, 0) : 0);
          const placedAt = o.placedAt ?? o.createdAt ?? Date.now();
          const priority = String((o as Record<string, unknown>).priority || '').toLowerCase();
          const status: OrderCardModel['status'] = priority === 'urgent' ? 'urgent' : (String(o.status || '').toLowerCase() === 'ready' ? 'ready' : 'pending');
          return { id: String(id), table, people, total: Math.round(computedTotal || 0), placedAt, status } as OrderCardModel;
        });
        setOrders(mapped);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Failed to load caja orders', msg);
        setOrders([]);
      })
      .finally(() => { if (mounted) setLoadingOrders(false); });
    return () => { mounted = false; };
  }, [refreshKey]);

  // Socket subscriptions: refresh caja list when relevant events arrive
  useEffect(() => {
    if (!socket) return;
    const handler = (_payload: unknown) => {
      setRefreshKey((k) => k + 1);
    };

    socket.on('order:item:status.changed', handler);
    socket.on('order:status.changed', handler);
    socket.on('order:updated', handler);
    socket.on('order:created', handler);

    return () => {
      socket.off('order:item:status.changed', handler);
      socket.off('order:status.changed', handler);
      socket.off('order:updated', handler);
      socket.off('order:created', handler);
    };
  }, [socket]);

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
          <div className="text-sm text-gray-500">Total pedidos: <span className="font-medium text-gray-800 dark:text-white/90">{loadingOrders ? '…' : orders.length}</span></div>
        </div>

        <div className="w-full flex-1 min-h-0 overflow-hidden">
          <div
            className="grid gap-4 w-full h-full min-h-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ gridAutoRows: 'minmax(0, 1fr)' }}
          >
            {loadingOrders ? (
              <div className="p-6">Cargando órdenes…</div>
            ) : orders.length === 0 ? (
              <div className="p-6">No hay órdenes disponibles.</div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="p-3 h-full min-h-0">
                  <OrderCard order={o} onClick={(id) => navigate(`/caja/detalles/${id}`)} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


import React, { useRef, useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router';
import { PageBreadcrumb, PageMeta, OrderCard } from "../../components";
import type { OrderCardModel } from "../../components/common/OrderCard";
import OrderService from "../Orders/Order.service";
import type { Order, Person, OrderItem } from "../../interfaces/Order.interface";
// Socket interactions suppressed — useSocket removed
import { SocketContext } from '../../context/SocketContext';
import { OrderStatus } from '../../constants/orderStatus';

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
  const { socket, connected } = useContext(SocketContext);

  useEffect(() => {
    let mounted = true;
    setLoadingOrders(true);
    OrderService.getCajaOrders()
      .then((res: Order[]) => {
        if (!mounted) return;
        // Limit orders to statuses relevant for Caja (orders ready/packaged/awaiting payment)
        const cajaStatuses = ['ready', 'packaged', 'awaiting_payment'];
        const filtered = (res || []).filter((o: Order) => cajaStatuses.includes(String(o.status ?? '').toLowerCase()));
        const mapped: OrderCardModel[] = (filtered || []).map((o: Order) => {
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

    // Socket-based refresh: update list when backend notifies about order changes
    // (e.g., order updated to awaiting_payment)
  useEffect(() => {
    if (!socket || !connected) return;

    const handler = (payload: any) => {
      const p = payload ?? {};
      const newStatus = p.newStatus ?? (p.notification && p.notification.data && p.notification.data.newStatus) ?? (p.data && p.data.newStatus);
      if (newStatus) {
        const ns = String(newStatus).toLowerCase();
        // Refresh when order enters or leaves awaiting payment (or other terminal states)
        if (
          ns === OrderStatus.AWAITING_PAYMENT ||
          ns === OrderStatus.PAID ||
          ns === OrderStatus.CANCELLED ||
          ns === OrderStatus.COMPLETED
        ) {
          setRefreshKey((k) => k + 1);
          return;
        }
      }
      // Fallback: if an orderId is present, refresh the list since it may affect caja
      if (p.orderId) setRefreshKey((k) => k + 1);
    };

    socket.on('order:updated', handler);
    socket.on('item:statusChanged', handler);

    return () => {
      socket.off('order:updated', handler);
      socket.off('item:statusChanged', handler);
    };
  }, [socket, connected]);
  
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


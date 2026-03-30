import React, { useRef, useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router';
import { PageBreadcrumb, PageMeta, OrderCard } from "../../components";
import type { OrderCardModel } from "../../components/common/OrderCard";
import OrderService from "../Orders/Order.service";
import type { Order, Person, OrderItem } from "../../interfaces/Order.interface";
// Socket interactions suppressed — useSocket removed
import { SocketContext } from '../../context/SocketContext';
import { OrderStatus } from '../../constants/orderStatus';
import { formatCurrency } from '../../utils/currency';

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
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] h-full">
                  <div className="overflow-x-auto h-full">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-white/[0.03] dark:text-gray-300">
                          <th className="px-4 py-3">Orden</th>
                          <th className="px-4 py-3">Mesa</th>
                          <th className="px-4 py-3">Comensales</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3">Colocado</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingOrders && [1,2,3,4].map(i => (
                          <tr key={i} className="border-t border-gray-100 dark:border-gray-800 animate-pulse">
                            {[1,2,3,4,5,6,7].map((c) => (
                              <td key={c} className="px-4 py-4"><div className="h-3 rounded bg-gray-200 dark:bg-gray-700" style={{width: `${30 + c*8}%`}}/></td>
                            ))}
                          </tr>
                        ))}

                        {!loadingOrders && orders.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-gray-400 dark:text-gray-300">
                              <div className="flex flex-col items-center gap-2">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="opacity-40">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                <span>No hay órdenes disponibles.</span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {!loadingOrders && orders.map((o) => (
                          <tr
                            key={o.id}
                            onClick={() => navigate(`/caja/detalles/${o.id}`)}
                            role="button"
                            tabIndex={0}
                            className="border-t border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] cursor-pointer"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 dark:text-white">{o.id}</div>
                              <div className="text-xs text-gray-500">#{o.id.slice(0,8)}</div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{String(o.table)}</td>
                            <td className="px-4 py-3 text-gray-600">{o.people}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{formatCurrency(o.total)}</td>
                            <td className="px-4 py-3 text-gray-500">{new Date(o.placedAt || Date.now()).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${o.status === 'urgent' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : o.status === 'ready' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200'}`}>
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: o.status === 'urgent' ? '#ef4444' : o.status === 'ready' ? '#10b981' : '#f59e0b' }} />
                                <span className="uppercase tracking-wider">{o.status === 'ready' ? 'Lista para cobrar' : o.status === 'urgent' ? 'Urgente' : 'Pendiente'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/caja/detalles/${o.id}`); }}
                                className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium bg-brand-500 text-white hover:bg-brand-600"
                              >
                                Ver detalles
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Footer count */}
                  {!loadingOrders && (
                    <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-400">
                      {orders.length} orden{orders.length !== 1 ? 'es' : ''}
                    </div>
                  )}
                </div>
              </div>
      </div>
    </div>
  );
}


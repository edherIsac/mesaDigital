import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import OrderService from "./Order.service";
import { SocketContext } from "../../context/SocketContext";
import { Order } from "../../interfaces/Order.interface";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { itemStatusLabel, itemStatusClass } from "../../constants/statuses";
import { OrderStatus, OrderStatusValues } from "../../constants/orderStatus";
import { formatCurrency } from '../../utils/currency';

function SkeletonRow() {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-800 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" style={{ width: `${40 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function Comandas() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const navigate = useNavigate();
  const { socket } = useContext(SocketContext);
  const pendingRef = useRef<Record<string, boolean>>({});

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await OrderService.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Error cargando órdenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to fetch and upsert a single order into state (debounced per id)
  const refreshOrder = async (orderId?: string) => {
    if (!orderId) return;
    if (pendingRef.current[orderId]) return;
    pendingRef.current[orderId] = true;
    try {
      const ord = await OrderService.getOrder(orderId);
      setOrders((prev) => {
        const idx = prev.findIndex((p) => String(p._id ?? p.id) === String(ord._id ?? ord.id));
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = ord;
          return copy;
        }
        return [ord, ...prev];
      });
    } catch (e) {
      // ignore fetch errors — maybe order not accessible yet
      // console.warn('Failed to refresh order', e);
    } finally {
      pendingRef.current[orderId] = false;
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleCreated = (payload: any) => {
      const id = payload?.orderId ?? payload?.orderId;
      if (!id) return;
      void refreshOrder(id);
    };

    const handleUpdated = (payload: any) => {
      const id = payload?.orderId ?? payload?.orderId;
      if (!id) return;
      void refreshOrder(id);
    };

    const handleCancelled = (payload: any) => {
      const id = payload?.orderId;
      if (!id) return;
      void refreshOrder(id);
    };

    const handleItemStatus = (payload: any) => {
      const id = payload?.orderId;
      if (!id) return;
      void refreshOrder(id);
    };

    socket.on('order:created', handleCreated);
    socket.on('order:updated', handleUpdated);
    socket.on('order:cancelled', handleCancelled);
    socket.on('item:statusChanged', handleItemStatus);

    return () => {
      socket.off('order:created', handleCreated);
      socket.off('order:updated', handleUpdated);
      socket.off('order:cancelled', handleCancelled);
      socket.off('item:statusChanged', handleItemStatus);
    };
  }, [socket]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchQ = q
        ? (o.orderNumber || "").toLowerCase().includes(q.toLowerCase()) ||
          (o.tableLabel || "").toLowerCase().includes(q.toLowerCase())
        : true;

      const matchStatus =
        statusFilter === "ALL" ? true : String((o.status || "")).toLowerCase() === String(statusFilter).toLowerCase();

      let matchDate = true;
      const placed = o.placedAt ? new Date(String(o.placedAt)) : o.createdAt ? new Date(String(o.createdAt)) : null;
      if (placed && dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00');
        if (placed < from) matchDate = false;
      }
      if (placed && dateTo) {
        const to = new Date(dateTo + 'T23:59:59');
        if (placed > to) matchDate = false;
      }

      let matchRole = true;
      if (roleFilter === 'CREATED_BY_MESERO') {
        matchRole = Boolean((o as any).placedBy);
      } else if (roleFilter === 'PAID_BY_CAJERO') {
        matchRole = Boolean((o as any).paidBy);
      }

      return matchQ && matchStatus && matchDate && matchRole;
    });
  }, [orders, q, statusFilter, dateFrom, dateTo, roleFilter]);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comandas</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{loading ? 'Cargando...' : `${filtered.length} de ${orders.length} órdenes`}</p>
        </div>
        <Button onClick={() => fetchOrders()} className="shrink-0">Actualizar</Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:flex-row">
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>Buscar</Label>
              <Input placeholder="Número de orden o mesa..." value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                <option value="ALL">Todos los estados</option>
                {OrderStatusValues.map((s) => (
                  <option key={s} value={s}>{itemStatusLabel(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Desde</Label>
              <input type="date" value={dateFrom ?? ""} onChange={(e) => setDateFrom(e.target.value || null)} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none" />
            </div>
            <div>
              <Label>Hasta</Label>
              <input type="date" value={dateTo ?? ""} onChange={(e) => setDateTo(e.target.value || null)} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none" />
            </div>
            <div>
              <Label>Por rol</Label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                <option value="ALL">Todos</option>
                <option value="CREATED_BY_MESERO">Creadas por mesero</option>
                <option value="PAID_BY_CAJERO">Pagadas por cajero</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-white/[0.03] dark:text-gray-300">
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Mesa</th>
                <th className="px-4 py-3">Personas</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Mesero / Cajero</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1,2,3,4].map((i) => <SkeletonRow key={i} />)}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 dark:text-gray-300">
                    <div className="flex flex-col items-center gap-2">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="opacity-40">
                        <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      <span>No se encontraron órdenes</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filtered.map((o) => {
                const placed = o.placedAt ? new Date(String(o.placedAt)) : o.createdAt ? new Date(String(o.createdAt)) : null;
                const peopleCount = Array.isArray(o.people) ? o.people.length : 0;
                const totalVal = (o as any).total ?? (o as any).subtotal ?? 0;
                return (
                  <tr key={String(o._id ?? o.id)} className="border-t border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{o.orderNumber ?? (o._id ? String(o._id).slice(-6) : '—')}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{o.tableLabel ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{peopleCount}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{formatCurrency(Number(totalVal) || 0)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{placed ? placed.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${itemStatusClass(o.status)}`}>
                        {itemStatusLabel(o.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <div className="flex flex-col text-sm">
                        <span>Mesero: {(o as any).placedBy ?? '—'}</span>
                        <span>Cajero: {(o as any).paidBy ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/caja/detalles/${o._id}`)} className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50">Ver</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-600">
            {filtered.length} orden{filtered.length !== 1 ? 'es' : ''}{filtered.length !== orders.length && ` de ${orders.length} total`}
          </div>
        )}
      </div>
    </div>
  );
}

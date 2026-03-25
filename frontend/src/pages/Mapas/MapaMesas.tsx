import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { useEffect, useState } from "react";
import MesaService from "../Admin/Mesas/Mesa.service";
import OrderService from "../Orders/Order.service";
import type { Order } from "../../interfaces/Order.interface";
import { itemStatusLabel, itemStatusClass } from "../../constants/statuses";
import { Mesa } from "../../interfaces/Mesa.interface";
import { useNavigate } from "react-router";
import { useSocket } from '../../hooks/useSocket';

export default function MapaMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const mesaStatusLabel = (s?: string) => {
    const st = (s || 'available').toLowerCase();
    if (st === 'occupied') return 'Ocupada';
    if (st === 'available') return 'Disponible';
    return st.charAt(0).toUpperCase() + st.slice(1);
  };

  const statusBadgeClass = (s?: string) => {
    const st = (s || 'available').toLowerCase();
    if (st === 'occupied')
      return 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    if (st === 'reserved')
      return 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
    return 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-white/[0.03] dark:text-gray-300';
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await MesaService.fetchMesas();
        const mesasList = data ?? [];

        // Fetch order statuses for mesas that have a currentOrderId
        const orderIds = Array.from(
          new Set(mesasList.map((x) => x.currentOrderId).filter(Boolean)),
        ) as string[];

        const orderStatusMap = new Map<string, string>();
        if (orderIds.length > 0) {
          const orders = await Promise.all(
            orderIds.map((id) => OrderService.getOrder(id).catch(() => null) as Promise<Order | null>),
          );
          orderIds.forEach((id, idx) => {
            const o = orders[idx];
            if (o && o.status) orderStatusMap.set(id, o.status);
          });
        }

        const enriched = mesasList.map((m) => ({
          ...m,
          orderStatus: m.currentOrderId
            ? orderStatusMap.get(m.currentOrderId)
            : undefined,
        }));

        if (mounted) setMesas(enriched);
      } catch {
        if (mounted) setMesas([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();

    return () => {
      mounted = false;
    };
  }, []);

  // Socket subscriptions: refresh mesas when orders change
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handler = (_payload: any) => {
      // Re-run the load effect by forcing a reload
      // Simple approach: call MesaService.fetchMesas + enrich again
      (async () => {
        try {
          const data = await MesaService.fetchMesas();
          const mesasList = data ?? [];
          const orderIds = Array.from(
            new Set(mesasList.map((x) => x.currentOrderId).filter(Boolean)),
          ) as string[];
          const orderStatusMap = new Map<string, string>();
          if (orderIds.length > 0) {
            const orders = await Promise.all(
              orderIds.map((id) => OrderService.getOrder(id).catch(() => null) as Promise<Order | null>),
            );
            orderIds.forEach((id, idx) => {
              const o = orders[idx];
              if (o && o.status) orderStatusMap.set(id, o.status);
            });
          }
          const enriched = mesasList.map((m) => ({
            ...m,
            orderStatus: m.currentOrderId
              ? orderStatusMap.get(m.currentOrderId)
              : undefined,
          }));
          setMesas(enriched);
        } catch {
          setMesas([]);
        }
      })();
    };

    socket.on('order:created', handler);
    socket.on('order:item:status.changed', handler);
    socket.on('order:status.changed', handler);
    socket.on('order:updated', handler);
    socket.on('order:item:removed', handler);

    return () => {
      socket.off('order:created', handler);
      socket.off('order:item:status.changed', handler);
      socket.off('order:status.changed', handler);
      socket.off('order:updated', handler);
      socket.off('order:item:removed', handler);
    };
  }, [socket]);

  // Navegar a la pantalla de inicio de comanda
  const goToStartOrder = (m: Mesa) => {
    navigate(`/orders/start/${m.id}`, { state: { mesa: m } });
  };

  return (
    <div>
      <PageMeta
        title="Mapa de mesas | mesaDigital"
        description="Mapa de mesas"
      />
      <PageBreadcrumb pageTitle="Mapa de mesas" />

      <div className="mx-auto w-full max-w-[1100px]">
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 w-full rounded-2xl bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-2 h-3 w-11/12 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {mesas.map((m) => (
                <ComponentCard
                  key={m.id}
                  title={m.label}
                  desc={`Asientos: ${m.seats ?? "-"} · ${mesaStatusLabel(m.status)}${m.orderStatus ? ' · ' + itemStatusLabel(m.orderStatus) : ''}`}
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${m.status === 'occupied' ? 'ring-2 ring-red-400/30 bg-red-50 dark:bg-red-900/10' : m.status === 'reserved' ? 'ring-2 ring-yellow-400/25 bg-yellow-50 dark:bg-yellow-900/10' : ''}`}
                  onClick={() => goToStartOrder(m)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Zona: {m.zone ?? "-"}</div>
                    <div className="ml-2 flex items-center gap-2">
                      <span className={statusBadgeClass(m.status)}>{mesaStatusLabel(m.status)}</span>
                      {m.currentOrderId && m.orderStatus && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${itemStatusClass(m.orderStatus)}`}>
                          {itemStatusLabel(m.orderStatus)}
                        </span>
                      )}
                    </div>
                  </div>
                </ComponentCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

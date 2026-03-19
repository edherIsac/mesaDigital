import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import React, { useEffect, useMemo, useState } from 'react';
import OrderService from '../Orders/Order.service';
import { OrderStatus } from '../../constants/orderStatus';
import { itemStatusLabel, itemStatusClass, normalizeStatus } from '../../constants/statuses';
import ComponentCard from '../../components/common/ComponentCard';

// Types for KDS
type Modifier = { priceAdjust?: number; qty?: number; name?: string };

type OrderItem = {
  _id?: string;
  id?: string;
  menuItemId?: string;
  name: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  price?: number;
  notes?: string;
  status?: string;
  modifiers?: Modifier[];
  assignedTo?: string;
};

type Person = { id?: string; name?: string; seat?: number; orders?: OrderItem[] };

type Order = {
  _id?: string;
  id?: string;
  orderNumber?: string;
  tableId?: string | null;
  locationId?: string | null;
  placedAt?: string | Date | null;
  items?: OrderItem[];
  people?: Person[];
};

type KDSItem = OrderItem & {
  orderId?: string;
  orderNumber?: string;
  tableId?: string | null;
  placedAt?: string | Date | null;
  personName?: string;
  _order?: Order;
};

type AggregatedKDSItem = KDSItem & { _ids: string[]; quantity: number };

type KDSGroup = { orderId: string; orderNumber?: string; tableId?: string | null; placedAt?: string | Date | null; items: AggregatedKDSItem[] };

export default function KDS() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing'>('all');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = (await OrderService.getOrders()) as Order[];
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch orders for KDS', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 8000);
    return () => clearInterval(t);
  }, []);

  const items = useMemo((): KDSGroup[] => {
    const out: KDSItem[] = [];
    for (const o of orders) {
      const orderId = o._id || o.id || o.orderNumber;
      const meta = {
        orderId,
        orderNumber: o.orderNumber,
        tableId: o.tableId,
        placedAt: o.placedAt,
      };

      (o.items || []).forEach((it: OrderItem) => {
        out.push({ ...it, ...meta, _order: o });
      });

      (o.people || []).forEach((p: Person) => {
        (p.orders || []).forEach((it: OrderItem) => {
          out.push({ ...it, personName: p.name, ...meta, _order: o });
        });
      });
    }

    const allowed = out.filter((it) => {
      const st = normalizeStatus(it.status);
      if (filter === 'pending') return st === OrderStatus.PENDING;
      if (filter === 'preparing') return st === OrderStatus.PREPARING;
      return st === OrderStatus.PENDING || st === OrderStatus.PREPARING;
    });

    // Group by order id
    const grouped: Record<string, KDSGroup> = {};
    for (const it of allowed as KDSItem[]) {
      const oid = String(it.orderId || it._order?._id || it._order?.id || 'unknown');
      if (!grouped[oid]) grouped[oid] = { orderId: oid, orderNumber: it.orderNumber, tableId: it.tableId, placedAt: it.placedAt, items: [] };
      grouped[oid].items.push(it as AggregatedKDSItem);
    }

    // Aggregate identical items within each order to save space
    for (const oid of Object.keys(grouped)) {
      const raw = grouped[oid].items as KDSItem[];
      const map = new Map<string, AggregatedKDSItem>();

      for (const it of raw) {
        const modsKey = it.modifiers
          ? JSON.stringify(
              (it.modifiers || [])
                .map((m) => ({ name: m.name ?? '', qty: m.qty ?? 0, priceAdjust: m.priceAdjust ?? 0 }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            )
          : '';
        const statusKey = normalizeStatus(it.status);
        const menuKey = it.menuItemId ?? it.name;
        const notesKey = (it.notes || '').trim();
        const priceKey = String(it.unitPrice ?? it.price ?? '');
        const key = `${menuKey}::${statusKey}::${modsKey}::${priceKey}::${notesKey}`;

        const qty = Number(it.quantity ?? it.qty ?? 1);
        const id = String(it._id ?? it.id ?? '');

        const existing = map.get(key);
        if (existing) {
          existing._ids = existing._ids.concat(id ? [id] : []);
          existing.quantity = (existing.quantity || 0) + qty;
        } else {
          const base: AggregatedKDSItem = {
            ...it,
            _ids: id ? [id] : [],
            quantity: qty,
          } as AggregatedKDSItem;
          map.set(key, base);
        }
      }

      grouped[oid].items = Array.from(map.values());
    }

    return Object.values(grouped).sort((a: KDSGroup, b: KDSGroup) => (b.placedAt ? new Date(String(b.placedAt)).getTime() : 0) - (a.placedAt ? new Date(String(a.placedAt)).getTime() : 0));
  }, [orders, filter]);

  const updateItemStatus = async (orderId: string, itemId: string, nextStatus: OrderStatus) => {
    setUpdatingIds((s) => ({ ...s, [itemId]: true }));
    try {
      await OrderService.updateOrderItem(orderId, itemId, { status: nextStatus });
      await fetchOrders();
    } catch (e) {
      console.error('Failed to update item status', e);
      window.alert('Error al actualizar el estado del platillo');
    } finally {
      setUpdatingIds((s) => {
        const c = { ...s };
        delete c[itemId];
        return c;
      });
    }
  };

  const updateAggregatedItemStatus = async (orderId: string, itemIds: string[], groupKey: string, nextStatus: OrderStatus) => {
    setUpdatingIds((s) => ({ ...s, [groupKey]: true }));
    try {
      // update all underlying item ids in parallel
      await Promise.all(itemIds.map((id) => OrderService.updateOrderItem(orderId, id, { status: nextStatus })));
      await fetchOrders();
    } catch (e) {
      console.error('Failed to update aggregated item status', e);
      window.alert('Error al actualizar el estado del platillo');
    } finally {
      setUpdatingIds((s) => {
        const c = { ...s };
        delete c[groupKey];
        return c;
      });
    }
  };

  return (
    <div>
      <PageMeta title="KDS | mesaDigital" description="Kitchen Display System — vista de cocina" />
      <PageBreadcrumb pageTitle="KDS" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="mb-1 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">Kitchen Display System</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Platillos pendientes y en preparación — KDS</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-md p-1">
              <button
                className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                onClick={() => setFilter('all')}
              >
                Todos
              </button>
              <button
                className={`px-3 py-1 rounded text-sm ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'text-gray-600'}`}
                onClick={() => setFilter('pending')}
              >
                Pendientes
              </button>
              <button
                className={`px-3 py-1 rounded text-sm ${filter === 'preparing' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                onClick={() => setFilter('preparing')}
              >
                En preparación
              </button>
            </div>

            <button className="px-3 py-1 rounded bg-gray-100 text-sm" onClick={fetchOrders}>
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {items.length === 0 && !loading ? (
          <div className="text-center text-gray-500 py-12">No hay platillos pendientes para preparar.</div>
        ) : (
          <div className="mx-auto w-full max-w-[1100px]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((grp: KDSGroup) => (
                <ComponentCard
                  key={grp.orderId}
                  title={grp.orderNumber || grp.orderId}
                  desc={`Mesa: ${grp.tableId || '—'} · ${grp.items.reduce((s, it) => s + (it.quantity || 0), 0)} platillo(s)`}
                  className="shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="space-y-2">
                    {grp.items.map((it: AggregatedKDSItem) => {
                      const itemKey = `agg-${grp.orderId}-${(it._ids || []).join('-')}-${it.name.replace(/\s+/g, '-')}`;
                      const st = normalizeStatus(it.status);
                      const canStart = st === OrderStatus.PENDING;
                      const canReady = st === OrderStatus.PREPARING;
                      return (
                        <div key={itemKey} className="flex items-center justify-between gap-3 p-2 rounded-md border border-gray-100 bg-white dark:bg-white/[0.01] dark:border-gray-800">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-white/90">{it.name} <span className="text-xs text-gray-500">x{it.quantity}</span></div>
                            {it.notes ? <div className="text-xs text-gray-400">{it.notes}</div> : null}
                            {it.personName ? <div className="text-xs text-gray-400">Comensal: {it.personName}</div> : null}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className={`px-2 py-1 rounded text-xs ${itemStatusClass(st)}`}>{itemStatusLabel(st)}</div>

                            {canStart && (
                              <button
                                disabled={!!updatingIds[itemKey]}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                                onClick={() => updateAggregatedItemStatus(grp.orderId, it._ids, itemKey, OrderStatus.PREPARING)}
                              >
                                {updatingIds[itemKey] ? '...' : 'Iniciar'}
                              </button>
                            )}

                            {canReady && (
                              <button
                                disabled={!!updatingIds[itemKey]}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                                onClick={() => updateAggregatedItemStatus(grp.orderId, it._ids, itemKey, OrderStatus.READY)}
                              >
                                {updatingIds[itemKey] ? '...' : 'Listo'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ComponentCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

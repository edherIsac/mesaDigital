import { PageBreadcrumb, PageMeta, ComponentCard } from "../../components";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAlert } from "../../context/AlertContext";
import OrderService from "../Orders/Order.service";
import { OrderStatus } from "../../constants/orderStatus";
import {
  itemStatusLabel,
  itemStatusClass,
  normalizeStatus,
} from "../../constants/statuses";
// ComponentCard is re-exported from the components barrel
import type {
  OrderItem,
  Person,
  Order,
  KDSItem,
  AggregatedKDSItem,
  KDSGroup,
} from "../../interfaces/Order.interface";
import { useSocket } from "../../hooks/useSocket";

export default function KDS() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "preparing">("all");
  const dynamicRef = useRef<HTMLDivElement | null>(null);
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);
  const alert = useAlert();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = (await OrderService.getKDSOrders()) as Order[];

      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch orders for KDS", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // const t = setInterval(fetchOrders, 8000);
    // return () => clearInterval(t);
  }, []);

  // Socket subscriptions: refresh KDS when relevant order events arrive
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handler = (_payload: any) => {
      // lightweight: re-fetch list on any relevant event
      fetchOrders();
    };

    socket.on('order:created', handler);
    socket.on('order:item:status.changed', handler);
    socket.on('order:status.changed', handler);
    socket.on('order:updated', handler);

    return () => {
      socket.off('order:created', handler);
      socket.off('order:item:status.changed', handler);
      socket.off('order:status.changed', handler);
      socket.off('order:updated', handler);
    };
  }, [socket]);

  useEffect(() => {
    const update = () => {
      if (!dynamicRef.current) return;
      const wrapperRect = dynamicRef.current.getBoundingClientRect();
      const avail = window.innerHeight - wrapperRect.top - 24; // 24px bottom spacing

      setDynamicHeight(avail > 0 ? Math.max(avail, 0) : 0);
    };
    update();
    window.addEventListener("resize", update);
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro) ro.observe(document.body);
    return () => {
      window.removeEventListener("resize", update);
      if (ro) ro.disconnect();
    };
  }, []);

  const items = useMemo((): KDSGroup[] => {
    const out: KDSItem[] = [];
    for (const o of orders) {
      const rawOrderId = o._id ?? o.id ?? o.orderNumber;
      const orderId = rawOrderId != null ? String(rawOrderId) : undefined;
      const meta = {
        orderId,
        orderNumber: o.orderNumber,
        tableId: o.tableId,
        tableLabel: o.tableLabel ?? undefined,
        placedAt: o.placedAt,
      };

      (o.people || []).forEach((p: Person) => {
        (p.orders || []).forEach((it: OrderItem) => {
          out.push({ ...it, personName: p.name, ...meta, _order: o });
        });
      });
    }

    const allowed = out.filter((it) => {
      const st = normalizeStatus(it.status);
      if (filter === "pending") return st === OrderStatus.PENDING;
      if (filter === "preparing") return st === OrderStatus.PREPARING;
      return st === OrderStatus.PENDING || st === OrderStatus.PREPARING;
    });

    // Group by order id
    const grouped: Record<string, KDSGroup> = {};
    for (const it of allowed as KDSItem[]) {
      const oid = String(
        it.orderId || it._order?._id || it._order?.id || "unknown",
      );
      if (!grouped[oid])
        grouped[oid] = {
          orderId: oid,
          orderNumber: it.orderNumber,
          tableId: it.tableId,
          tableLabel: it.tableLabel,
          placedAt: it.placedAt,
          items: [],
        };
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
                .map((m) => ({
                  name: m.name ?? "",
                  qty: m.qty ?? 0,
                  priceAdjust: m.priceAdjust ?? 0,
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            )
          : "";
        const statusKey = normalizeStatus(it.status);
        const menuKey = it.menuItemId ?? it.name;
        const notesKey = (it.notes || "").trim();
        const priceKey = String(it.unitPrice ?? it.price ?? "");
        const personKey = (it.personName || "").toString().trim();
        // include personName in aggregation key so identical items for different persons are not merged
        const key = `${menuKey}::${statusKey}::${personKey}::${modsKey}::${priceKey}::${notesKey}`;

        const qty = Number(it.quantity ?? it.qty ?? 1);
        const id = String(it._id ?? it.id ?? "");

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

    return Object.values(grouped).sort(
      (a: KDSGroup, b: KDSGroup) =>
        (a.placedAt ? new Date(String(a.placedAt)).getTime() : 0) -
        (b.placedAt ? new Date(String(b.placedAt)).getTime() : 0),
    );
  }, [orders, filter]);

  const tableLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    let idx = 1;
    for (const grp of items) {
      const key = String(
        grp.tableLabel ?? grp.tableId ?? grp.orderId ?? `order-${idx}`,
      );
      if (!map.has(key)) {
        map.set(key, `M${idx}`);
        idx += 1;
      }
    }
    return map;
  }, [items]);

  const updateAggregatedItemStatus = async (
    orderId: string,
    itemIds: string[],
    groupKey: string,
    nextStatus: OrderStatus,
  ) => {
    setUpdatingIds((s) => ({ ...s, [groupKey]: true }));
    try {
      // update all underlying item ids in parallel
      await Promise.all(
        itemIds.map((id) =>
          OrderService.updateOrderItem(orderId, id, { status: nextStatus }),
        ),
      );
      await fetchOrders();
    } catch (e) {
      console.error("Failed to update aggregated item status", e);
      alert.error("Error al actualizar el estado del platillo");
    } finally {
      setUpdatingIds((s) => {
        const c = { ...s };
        delete c[groupKey];
        return c;
      });
    }
  };

  // const markOrderReady = async (orderId: string, groupKey?: string) => {
  //   const key = groupKey || `order-${orderId}`;
  //   setUpdatingIds((s) => ({ ...s, [key]: true }));
  //   try {
  //     await OrderService.updateOrderStatus(orderId, OrderStatus.READY);
  //     await fetchOrders();
  //   } catch (e) {
  //     console.error("Failed to mark order ready", e);
  //     alert.error("Error al marcar la comanda como lista");
  //   } finally {
  //     setUpdatingIds((s) => {
  //       const c = { ...s };
  //       delete c[key];
  //       return c;
  //     });
  //   }
  // };

  // Tick to force periodic re-render so elapsed times and glow update (1s)
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const timeAgo = (when?: string | Date | null) => {
    if (!when) return "";
    const d = new Date(String(when));
    if (isNaN(d.getTime())) return "";
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 5) return "ahora";
    if (sec < 60) return `hace ${sec}s`;
    const mins = Math.floor(sec / 60);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  };

  return (
    <div>
      <PageMeta
        title="KDS | mesaDigital"
        description="Kitchen Display System — vista de cocina"
      />
      <PageBreadcrumb pageTitle="KDS" />

      <div
        ref={dynamicRef}
        style={dynamicHeight ? { height: `${dynamicHeight}px` } : undefined}
        className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-5 xl:py-7 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="flex items-center justify-start mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-md p-1 border border-gray-100 dark:bg-white/[0.03] dark:border-gray-800">
              <button
                className={`px-3 py-1 rounded text-sm ${
                  filter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-white/[0.03] text-gray-600 dark:text-gray-300"
                }`}
                onClick={() => setFilter("all")}
              >
                Todos
              </button>
              <button
                className={`px-3 py-1 rounded text-sm ${
                  filter === "pending"
                    ? "bg-yellow-600 text-white"
                    : "bg-white dark:bg-white/[0.03] text-gray-600 dark:text-gray-300"
                }`}
                onClick={() => setFilter("pending")}
              >
                Pendientes
              </button>
              <button
                className={`px-3 py-1 rounded text-sm ${
                  filter === "preparing"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-white/[0.03] text-gray-600 dark:text-gray-300"
                }`}
                onClick={() => setFilter("preparing")}
              >
                En preparación
              </button>
            </div>

            <button
              className="px-3 py-1 rounded bg-white dark:bg-white/[0.03] text-sm text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800"
              onClick={fetchOrders}
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        <div className="w-full flex-1 min-h-0 overflow-hidden">
          <div
            className="grid gap-4 w-full h-full min-h-0"
            style={{
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gridAutoRows: "minmax(0, 1fr)",
            }}
          >
            {(() => {
              const visible = items.slice(0, 6);
              const extra = Math.max(0, items.length - 6);
              return Array.from({ length: 6 }).map((_, slotIndex) => {
                const grp = visible[slotIndex];
                if (!grp) {
                  return (
                    <div key={`cell-${slotIndex}`} className="p-3 h-full min-h-0">
                      <ComponentCard
                        noHeader
                        className="shadow-sm hover:shadow-lg transition-shadow h-full"
                        fillHeight
                        bodyClassName="p-2 sm:p-2 flex items-center justify-center text-gray-400"
                      >
                        <div className="text-sm">Vacío</div>
                      </ComponentCard>
                    </div>
                  );
                }

                const tableKey = String(
                  grp.tableLabel ?? grp.tableId ?? grp.orderId,
                );
                const tableLabel = tableLabelMap.get(tableKey) ?? "M?";

                // Glow parameters based on age since placedAt
                const placedTs = grp.placedAt ? new Date(String(grp.placedAt)).getTime() : 0;
                const ageSec = placedTs ? Math.max(0, (Date.now() - placedTs) / 1000) : 0;
                const GLOW_MAX_SECONDS = 600; // reach full red after 10 minutes (adjustable)
                const ratio = Math.min(1, ageSec / GLOW_MAX_SECONDS);
                const alpha = ratio; // 0 -> 1
                // Extra-tight glow: minimal blur and spread, lower max alpha
                const blur = 3 + ratio * 6; // 3 -> 9
                const spread = ratio * 1.5; // 0 -> 1.5
                const shadowColor = `rgba(255,0,0,${Math.min(0.45, alpha * 0.45)})`;
                const boxShadow = ratio > 0 ? `0 0 ${blur}px ${spread}px ${shadowColor}` : "none";

                return (
                  <div key={`cell-${grp.orderId}`} className="p-3 h-full min-h-0">
                    <ComponentCard
                      noHeader
                      className="shadow-sm hover:shadow-lg transition-shadow relative h-full"
                      fillHeight
                      bodyClassName="p-2 sm:p-2"
                      style={{
                        boxShadow,
                        borderColor: ratio ? `rgba(255,0,0,${Math.min(0.25, ratio * 0.25)})` : undefined,
                        transition: 'box-shadow 0.9s linear, border-color 0.9s linear',
                        willChange: 'box-shadow, border-color',
                      }}
                    >
                    {extra > 0 && slotIndex === 5 && (
                      <div className="absolute top-2 right-2 bg-black text-white text-xs rounded px-2">
                        +{extra}
                      </div>
                    )}

                      <div
                        className="min-h-0"
                        style={{
                          display: "grid",
                          gridTemplateRows: "auto 1fr",
                          height: "100%",
                        }}
                      >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white/90 truncate">
                            {grp.tableLabel ?? tableLabel}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            Mesa donde se levantó la comanda · {grp.items.reduce(
                              (s, it) => s + (it.quantity || 0),
                              0,
                            )} plat.
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {timeAgo(grp.placedAt)}
                        </div>
                      </div>

                      <div className="overflow-auto min-h-0">
                        <div className="space-y-2">
                          {(() => {
                            // group aggregated items by personName — skip items without personName
                            const persons = new Map<string, AggregatedKDSItem[]>();
                            for (const it of grp.items) {
                              const raw = it.personName;
                              const p = raw ? String(raw).trim() : "";
                              if (!p) continue; // ignore general / unassigned items
                              const arr = persons.get(p) || [];
                              arr.push(it);
                              persons.set(p, arr);
                            }

                            return Array.from(persons.entries()).map(
                              ([pname, itemsForPerson]) => (
                                <div key={pname}>
                                  <div className="text-xs font-semibold text-gray-500 mb-1">
                                    {`Comensal: ${pname}`}
                                  </div>
                                  <div className="space-y-1">
                                    {itemsForPerson.map((it: AggregatedKDSItem) => {
                                      const itemKey = `agg-${grp.orderId}-${(it._ids || []).join("-")}-${it?.name?.replace(/\s+/g, "-")}`;
                                      const st = normalizeStatus(it.status);
                                      const canStart = st === OrderStatus.PENDING;
                                      const canReady = st === OrderStatus.PREPARING;
                                      return (
                                        <div
                                          key={itemKey}
                                          className="flex items-center justify-between gap-2 py-1 px-2 rounded-md border border-gray-100 bg-white dark:bg-white/[0.01] dark:border-gray-800"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                                              {it.name} <span className="text-xs text-gray-500">x{it.quantity}</span>
                                            </div>
                                            {(it.notes || it.note) && (
                                              <div className="text-xs italic text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                                {it.notes || it.note}
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1">
                                            <div className={`px-2 py-0.5 rounded text-xs ${itemStatusClass(st)}`}>
                                              {itemStatusLabel(st)}
                                            </div>

                                            {canStart && (
                                              <button
                                                disabled={!!updatingIds[itemKey]}
                                                className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs"
                                                onClick={() => updateAggregatedItemStatus(
                                                  grp.orderId,
                                                  it._ids,
                                                  itemKey,
                                                  OrderStatus.PREPARING,
                                                )}
                                              >
                                                {updatingIds[itemKey] ? "..." : "Iniciar"}
                                              </button>
                                            )}

                                            {canReady && (
                                              <button
                                                disabled={!!updatingIds[itemKey]}
                                                className="px-2 py-0.5 bg-green-600 text-white rounded text-xs"
                                                onClick={() => updateAggregatedItemStatus(
                                                  grp.orderId,
                                                  it._ids,
                                                  itemKey,
                                                  OrderStatus.READY,
                                                )}
                                              >
                                                {updatingIds[itemKey] ? "..." : "Listo"}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ),
                            );
                          })()}
                        </div>
                      </div>

                      {/* divider and "Comanda lista" button removed */}
                    </div>
                  </ComponentCard>
                </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

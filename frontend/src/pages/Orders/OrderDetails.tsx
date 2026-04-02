import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { itemStatusLabel, itemStatusClass, normalizeStatus } from "../../constants/statuses";
import OrderService from "./Order.service";
import ProductService from "../Admin/Products/Product.service";
import { OrderStatus } from "../../constants/orderStatus";
import { formatCurrency, DEFAULT_CURRENCY } from '../../utils/currency';
import { SocketContext } from '../../context/SocketContext';
import { resolveUserNames } from '../../utils/userCache';
import type { Order, Person, OrderItem } from "../../interfaces/Order.interface";
import type { ComandaPerson, ComandaTotals } from "../../interfaces/Comanda.interface";

export default function OrderDetails() {
  const { id } = useParams() as { id?: string };
  const navigate = useNavigate();
  const { socket } = useContext(SocketContext);
  const mountedRef = useRef(true);

  const [order, setOrder] = useState<Order | null>(null);
  const [people, setPeople] = useState<ComandaPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [userNames, setUserNames] = useState<Record<string,string>>({});

  // reusable fetch + populate function (used by initial load and socket updates)
  const fetchAndPopulate = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await OrderService.getOrder(id);
      if (!mountedRef.current) return;
      setOrder(res as Order);

      // Map backend order -> ComandaPerson[] for UI
      const mappedPeople: ComandaPerson[] = [];
      if (res.people && Array.isArray(res.people) && res.people.length > 0) {
        for (const p of res.people as Person[]) {
          const mappedOrders = (p.orders || []).map((o: OrderItem, oi: number) => ({
            id: o._id ?? `${p.id ?? 'p'}-${oi}`,
            productId: o.menuItemId ? String(o.menuItemId) : undefined,
            product: null,
            name: o.name ?? '',
            qty: o.quantity ?? o.qty ?? 1,
            note: o.notes ?? o.note ?? "",
            unitPrice: o.unitPrice ?? o.price ?? 0,
            type: 'platillo',
            coverImage: undefined,
            status: o.status ?? 'pending',
          }));
          mappedPeople.push({ id: p.id ?? String(mappedPeople.length + 1), name: p.name ?? '', seat: p.seat, orders: mappedOrders });
        }
      }

      // Load product images for items that reference menuItemId
      try {
        const ids = new Set<string>();
        for (const p of mappedPeople) for (const it of p.orders) if (!it.coverImage && it.productId) ids.add(String(it.productId));
        if (ids.size > 0) {
          const fetches = Array.from(ids).map((pid) => ProductService.fetchProductById(pid).catch(() => null));
          const prods = await Promise.all(fetches);
          const coverById = new Map<string, string | undefined>();
          prods.forEach((prod: any) => { if (prod && prod.id) coverById.set(String(prod.id), prod.coverImage ?? undefined); });
          const withImages = mappedPeople.map((p) => ({
            ...p,
            orders: p.orders.map((it) => ({ ...it, coverImage: it.coverImage ?? (it.productId ? coverById.get(String(it.productId)) : undefined) })),
          }));
          if (!mountedRef.current) return;
          setPeople(withImages);
        } else {
          if (!mountedRef.current) return;
          setPeople(mappedPeople);
        }
      } catch (e) {
        if (!mountedRef.current) return;
        setPeople(mappedPeople);
      }

      // resolve placedBy / paidBy names
      try {
        const idsToResolve: Array<string | undefined | null> = [];
        if ((res as any)?.placedBy) idsToResolve.push((res as any).placedBy);
        if ((res as any)?.paidBy) idsToResolve.push((res as any).paidBy);
        if (idsToResolve.length > 0) {
          const resolved = await resolveUserNames(idsToResolve);
          if (!mountedRef.current) return;
          setUserNames(resolved);
        }
      } catch (e) {
        // ignore name resolution
      }

    } catch (e) {
      // ignore
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void fetchAndPopulate();
    return () => { mountedRef.current = false; };
  }, [id]);

  // Socket-driven refresh for this order
  useEffect(() => {
    if (!socket || !id) return;

    const handle = (payload: any) => {
      const oid = payload?.orderId;
      if (!oid) return;
      if (String(oid) !== String(id)) return;
      void fetchAndPopulate();
    };

    socket.on('order:updated', handle);
    socket.on('order:cancelled', handle);
    socket.on('item:statusChanged', handle);

    return () => {
      socket.off('order:updated', handle);
      socket.off('order:cancelled', handle);
      socket.off('item:statusChanged', handle);
    };
  }, [socket, id]);

  const computeTotals = (persons: ComandaPerson[]): ComandaTotals => {
    const subtotal = persons.reduce(
      (sum, p) => sum + p.orders.reduce((s, o) => s + ((o.unitPrice ?? 0) * (o.qty ?? 1)), 0),
      0,
    );
    const taxes = 0;
    const service = 0;
    const discount = 0;
    const total = subtotal + taxes + service - discount;
    return { subtotal, taxes, service, discount, total };
  };

  const orderStatusLabel = (s?: string) => {
    const st = normalizeStatus(s);
    if (st === OrderStatus.PENDING) return 'Pendiente';
    if (st === OrderStatus.ACCEPTED) return 'Aceptada';
    if (st === OrderStatus.PREPARING) return 'En preparación';
    if (st === OrderStatus.ON_HOLD) return 'En espera';
    if (st === OrderStatus.READY) return 'Lista';
    if (st === OrderStatus.PACKAGED) return 'Empaquetada';
    if (st === OrderStatus.AWAITING_PAYMENT) return 'Pendiente de pago';
    if (st === OrderStatus.PAID) return 'Pagada';
    if (st === OrderStatus.DELIVERED) return 'Entregada';
    if (st === OrderStatus.SERVED) return 'Servida';
    if (st === OrderStatus.CANCELLED) return 'Cancelada';
    if (st === OrderStatus.COMPLETED || st === 'done') return 'Completada';
    return st.charAt(0).toUpperCase() + st.slice(1);
  };

  const orderStatusBadgeClass = (s?: string) => {
    const st = normalizeStatus(s);
    if (st === OrderStatus.PENDING) return 'rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs font-medium dark:bg-yellow-900/20 dark:text-yellow-300';
    if (st === OrderStatus.PREPARING) return 'rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-medium dark:bg-blue-900/20 dark:text-blue-300';
    if (st === OrderStatus.READY) return 'rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium dark:bg-green-900/20 dark:text-green-300';
    if (st === OrderStatus.COMPLETED || st === 'done') return 'rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium dark:bg-green-900/20 dark:text-green-300';
    if (st === OrderStatus.CANCELLED) return 'rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium dark:bg-red-900/20 dark:text-red-300';
    return 'rounded-full bg-gray-100 text-gray-800 px-2 py-0.5 text-xs font-medium dark:bg-white/[0.03] dark:text-gray-300';
  };

  const totals = computeTotals(people);

  return (
    <div>
      <PageMeta title="Detalles de la comanda" description="Detalles de la comanda" />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-white/[0.02]"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Detalles de la comanda</h2>
        </div>

        <nav>
          <ol className="flex items-center gap-1.5">
            <li>
              <a className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400" href="/">Home</a>
            </li>
            <li className="text-sm text-gray-800 dark:text-white/90">Detalles</li>
          </ol>
        </nav>
      </div>

      <div className="w-full">
        <div className="mt-6">
          <ComponentCard title={order?.tableLabel ?? `Orden ${order?.orderNumber ?? ''}`} desc={""} noHeader>
            {loading ? (
              <div className="animate-pulse flex gap-4">
                <div className="h-10 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-10 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-10 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-6 flex-wrap sm:flex-nowrap">
                <div className="min-w-0">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Mesa</div>
                  <div className="text-xl font-semibold text-gray-800 dark:text-white/90">{order?.tableLabel ?? '-'}</div>
                </div>

                <div className="flex gap-6 items-center">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Orden</div>
                    <div className="font-medium text-gray-800 dark:text-white/90">{order?.orderNumber ?? '—'}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Fecha</div>
                    <div className="font-medium text-gray-800 dark:text-white/90">{order?.placedAt ? new Date(String(order.placedAt)).toLocaleString() : '—'}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Estado</div>
                    <div className="mt-1">
                      <span className={`${orderStatusBadgeClass(order?.status)}`}>
                        {orderStatusLabel(order?.status)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Mesero / Cajero</div>
                    <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                      <div>Mesero: {userNames[String((order as any)?.placedBy)] ?? ((order as any)?.placedBy ?? '—')}</div>
                      <div>Cajero: {userNames[String((order as any)?.paidBy)] ?? ((order as any)?.paidBy ?? '—')}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ComponentCard>
        </div>

        <div className="mt-4">
          <ComponentCard className="w-full" noHeader>
            <div className="h-full flex flex-col min-h-0">
              <div className="shrink-0 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-semibold text-gray-800 dark:text-white/90">Comanda</span>
                  <span className="rounded-full bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-300">{people.length} persona{people.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-3 pr-0.5">
                {people.map((person) => {
                  const personTotal = person.orders.reduce((s, o) => s + ((o.unitPrice ?? 0) * (o.qty ?? 1)), 0);
                  const initials = person.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={person.id} className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.07]">
                      <div className="flex items-center">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 text-xs font-bold`}>{initials}</div>
                        <div className="flex-1 px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">{person.name}</div>
                        <div className="w-16 shrink-0 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(personTotal, DEFAULT_CURRENCY)}</div>
                      </div>

                      <div className="bg-white dark:bg-white/[0.01]">
                        <div className="grid items-center gap-3 border-b border-gray-50 dark:border-white/[0.04] px-4 py-1.5 bg-gray-50/60 dark:bg-white/[0.01]" style={{ gridTemplateColumns: "2.5rem 1fr 3.5rem 8rem 4.5rem" }}>
                          <div />
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Platillo</div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center">Cant</div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Nota</div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Importe</div>
                        </div>

                        {person.orders.map((o) => {
                          const img = o.coverImage ?? '/images/product/product-01.jpg';
                          return (
                            <div key={o.id} className="grid items-center gap-3 border-b border-gray-50 dark:border-white/[0.03] px-4 py-2.5 last:border-b-0 transition-colors" style={{ gridTemplateColumns: "2.5rem 1fr 3.5rem 8rem 4.5rem" }}>
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100"><img src={img} alt={o.name} className="h-full w-full object-cover" /></div>
                              <div className="min-w-0"><div className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{o.name}</div><div className="mt-0.5"><span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${itemStatusClass(o.status)}`}>{itemStatusLabel(o.status)}</span></div></div>
                              <div className="flex justify-center"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15 text-xs font-semibold text-brand-600 dark:text-brand-300">{o.qty}</span></div>
                              <div className="truncate text-xs italic text-gray-400 dark:text-gray-500">{o.note || '—'}</div>
                              <div className="text-right text-sm font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(((o.unitPrice ?? 0) * (o.qty ?? 1)), DEFAULT_CURRENCY)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="shrink-0 flex items-center justify-end gap-4 border-t border-gray-100 dark:border-white/[0.05] pt-3 mt-1">
                <div className="text-right">
                  <div className="text-xs text-gray-400 dark:text-gray-500">Total comanda</div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-white/90">{formatCurrency(totals.total, DEFAULT_CURRENCY)}</div>
                </div>
              </div>
            </div>
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}

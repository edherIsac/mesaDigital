import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import POSList, { POSItem } from "../../components/caja/POSList";
import POSSummary from "../../components/caja/POSSummary";
import ComponentCard from "../../components/common/ComponentCard";
import client from "../../api/client";

export default function CajaDetails(): JSX.Element {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const MOCK_ITEMS: POSItem[] = [
    { id: "1", name: "Pizza Margherita", qty: 2, unitPrice: 8.5 },
    { id: "2", name: "Ensalada César", qty: 1, unitPrice: 6.0 },
    { id: "3", name: "Tacos al Pastor", qty: 3, unitPrice: 2.75 },
    { id: "4", name: "Agua mineral", qty: 2, unitPrice: 1.5 },
    { id: "5", name: "Lomo Saltado", qty: 1, unitPrice: 9.25 },
    { id: "6", name: "Hamburguesa clásica", qty: 2, unitPrice: 7.0 },
    { id: "7", name: "Sopa del día", qty: 1, unitPrice: 4.5 },
    { id: "8", name: "Nachos con queso", qty: 2, unitPrice: 5.5 },
    { id: "9", name: "Enchiladas", qty: 1, unitPrice: 6.75 },
    { id: "10", name: "Café americano", qty: 3, unitPrice: 1.75 },
    { id: "11", name: "Brownie", qty: 2, unitPrice: 3.5 },
    { id: "12", name: "Agua con gas", qty: 1, unitPrice: 1.75 },
  ];

  const initialSubtotal = MOCK_ITEMS.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const initialTaxes = +(initialSubtotal * 0.1).toFixed(2);
  const initialTotal = +(initialSubtotal + initialTaxes).toFixed(2);

  const [items, setItems] = useState<POSItem[]>(MOCK_ITEMS);
  const [groups, setGroups] = useState<{ personName?: string; seat?: number; items: POSItem[] }[] | null>(null);
  const [tableLabel, setTableLabel] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState<number>(initialSubtotal);
  const [taxes, setTaxes] = useState<number>(initialTaxes);
  const [total, setTotal] = useState<number>(initialTotal);
  const [loadingOrder, setLoadingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const dynamicRef = useRef<HTMLDivElement | null>(null);
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (!dynamicRef.current) return;
      const wrapperRect = dynamicRef.current.getBoundingClientRect();
      const avail = window.innerHeight - wrapperRect.top - 24;
      setDynamicHeight(avail > 0 ? Math.max(avail, 0) : 0);
    };
    update();
    window.addEventListener("resize", update);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro) ro.observe(document.body);
    return () => {
      window.removeEventListener("resize", update);
      if (ro) ro.disconnect();
    };
  }, []);

  // Fetch order details when `id` is present and map to POSList items
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const fetchOrder = async () => {
      setLoadingOrder(true);
      setOrderError(null);
      try {
        const res = await client.get(`/orders/${id}`);
        const data = res.data ?? res;

        const people = Array.isArray(data?.people) ? data.people : [];
        const groupsArr: { personName?: string; items: POSItem[] }[] = [];
        for (const p of people) {
          const porders = Array.isArray(p.orders) ? p.orders : [];
          const personItems: POSItem[] = [];
          for (const it of porders) {
            const menuItemId = it.menuItemId ? String(it.menuItemId) : undefined;
            personItems.push({
              id: String(it._id ?? it.id ?? Math.random().toString(36).slice(2)),
              name: it.name ?? 'Item',
              qty: it.quantity ?? it.qty ?? 1,
              unitPrice: it.unitPrice ?? it.price ?? 0,
              notes: it.notes ?? undefined,
              image: it.coverImage ?? it.image ?? undefined,
              menuItemId,
            });
          }
          groupsArr.push({ personName: p.name ?? undefined, seat: typeof p?.seat !== 'undefined' ? p.seat : undefined, items: personItems });
        }

        if (cancelled) return;
          setTableLabel(data?.tableLabel ?? null);

        // If items reference products, try to fetch product cover images
        const allItems = groupsArr.flatMap((g) => g.items);
        const uniqueMenuIds = Array.from(new Set(allItems.map((m) => m.menuItemId).filter(Boolean))) as string[];
        if (uniqueMenuIds.length) {
          try {
            const results = await Promise.allSettled(uniqueMenuIds.map((pid) => client.get(`/products/${pid}`)));
            const coverMap: Record<string, string | null> = {};
            results.forEach((r, i) => {
              const pid = uniqueMenuIds[i];
              if (r.status === 'fulfilled') {
                const d = r.value.data ?? r.value;
                coverMap[pid] = d?.coverImage ?? null;
              } else {
                coverMap[pid] = null;
              }
            });

            for (const g of groupsArr) {
              for (const m of g.items) {
                if (!m.image && m.menuItemId && coverMap[m.menuItemId]) m.image = coverMap[m.menuItemId] as string;
              }
            }
          } catch {
            // ignore image fetch errors
          }
        }

        setGroups(groupsArr.length ? groupsArr : null);
          setItems(allItems.length ? allItems : MOCK_ITEMS);

        const newSubtotal = typeof data?.subtotal !== 'undefined' ? data.subtotal : mapped.reduce((s, it) => s + it.qty * it.unitPrice, 0);
        const newTaxes = typeof data?.tax !== 'undefined' ? data.tax : +(newSubtotal * 0.1).toFixed(2);
        const newTotal = typeof data?.total !== 'undefined' ? data.total : +(newSubtotal + newTaxes).toFixed(2);

        setSubtotal(newSubtotal);
        setTaxes(newTaxes);
        setTotal(newTotal);
      } catch (e: any) {
        setOrderError(e?.message || 'Error cargando la orden');
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-white/[0.02]"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-gray-100">Caja — {id ?? "Detalle"}</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        <div className="lg:col-span-9">
          <div
            ref={dynamicRef}
            style={dynamicHeight ? { height: `${dynamicHeight}px` } : undefined}
          >
            <ComponentCard className="w-full h-full shadow-sm hover:shadow-lg transition-shadow" noHeader fillHeight>
              <div className="h-full flex flex-col min-h-0">
                <div className="shrink-0 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.05]">
                  <div>
                    {tableLabel && (
                      <h1 className="text-xl font-bold text-gray-100 mb-1">{tableLabel}</h1>
                    )}
                    <h3 className="text-lg font-semibold text-gray-100">Platillos</h3>
                    <div className="text-sm text-gray-400">Lista de productos a cobrar</div>
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                  <POSList items={items} groups={groups ?? undefined} badgeVariant="solid" qtyBadgeColor="success" priceBadgeColor="warning" badgeSize="md" />
                </div>
              </div>
            </ComponentCard>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="sticky top-6">
            <ComponentCard title="Resumen" className="shadow-sm hover:shadow-lg transition-shadow">
              <POSSummary
                subtotal={subtotal}
                taxes={taxes}
                total={total}
                onCharge={() => console.log("Cobrar orden", id)}
                onCancel={() => navigate(-1)}
              />
            </ComponentCard>
          </div>
        </div>
      </div>
    </div>
  );
}

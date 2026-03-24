import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { PageBreadcrumb, PageMeta, ComponentCard } from "../../components";
import OrderService from "../Orders/Order.service";
import ProductService from "../Admin/Products/Product.service";
import type { Order } from "../../interfaces/Order.interface";
import PersonGroupCard from "../../components/caja/PersonGroupCard";
import PaymentSummary from "../../components/caja/PaymentSummary";

export default function CajaDetails() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const dynamicRef = useRef<HTMLDivElement | null>(null);
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const res = await OrderService.getOrder(id);

        // If items don't include a coverImage, try to fetch product records
        if (res && res.people && Array.isArray(res.people) && res.people.length > 0) {
          try {
            const ids = new Set<string>();
            for (const p of res.people) {
              for (const it of p.orders || []) {
                const pid = (it as any).productId ?? (it as any).menuItemId ?? undefined;
                if (!it.coverImage && pid) ids.add(String(pid));
              }
            }

            if (ids.size > 0) {
              const fetches = Array.from(ids).map((i) => ProductService.fetchProductById(String(i)).then((prod) => prod).catch(() => null));
              const products = await Promise.all(fetches);
              const coverById = new Map<string, string | undefined>();
              products.forEach((prod) => {
                if (prod && (prod as any).id) coverById.set(String((prod as any).id), (prod as any).coverImage ?? undefined);
              });

              const withImages = res.people.map((p) => ({
                ...p,
                orders: (p.orders || []).map((it) => {
                  const pid = (it as any).productId ?? (it as any).menuItemId ?? undefined;
                  const fromProduct = pid ? coverById.get(String(pid)) : undefined;
                  return { ...it, coverImage: it.coverImage ?? fromProduct ?? (it as any).product?.coverImage ?? undefined };
                }),
              }));

              if (!mounted) return;
              setOrder({ ...res, people: withImages });
            } else {
              if (!mounted) return;
              setOrder(res || null);
            }
          } catch (imgErr) {
            console.warn("Could not fetch product images for order", imgErr);
            if (!mounted) return;
            setOrder(res || null);
          }
        } else {
          if (!mounted) return;
          setOrder(res || null);
        }
      } catch (err) {
        console.warn("Could not load order", err);
        setOrder(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    const update = () => {
      if (!dynamicRef.current) return;
      const wrapperRect = dynamicRef.current.getBoundingClientRect();
      const avail = window.innerHeight - wrapperRect.top - 24;
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

  // Presentation-only: this view delegates calculations to backend or parent logic.

  if (loading) {
    return (
      <div>
        <PageMeta title="Caja — Detalle" description="Cargando orden..." />
        <PageBreadcrumb pageTitle="Caja / Detalle" />
        <div className="p-6">Cargando...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PageMeta title="Caja — Detalle" description="Orden no encontrada" />
        <PageBreadcrumb pageTitle="Caja / Detalle" />
        <div className="p-6">
          <div className="text-gray-600">Orden no encontrada.</div>
          <button
            className="mt-4 px-3 py-2 bg-gray-100 rounded"
            onClick={() => navigate("/caja")}
          >
            Volver a Caja
          </button>
        </div>
      </div>
    );
  }

  // Note: no client-side price calculations here; components render presentation placeholders.

  return (
    <div>
      <PageMeta
        title={`Caja — ${order.tableLabel ?? order.tableId ?? "Detalle"}`}
        description="Detalle de orden"
      />
      <div className="flex items-center justify-between mb-2 w-full">
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
        </div>

        <div className="text-right">
          <PageBreadcrumb pageTitle={`Caja / ${order.tableLabel ?? order.tableId ?? "Detalle"}`} />
        </div>
      </div>

      <div
        ref={dynamicRef}
        style={dynamicHeight ? { height: `${dynamicHeight}px` } : undefined}
        className="mt-4"
      >
        <ComponentCard className="w-full h-full" noHeader fillHeight>
          <div className="h-full flex flex-col min-h-0">
            <div className="shrink-0 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.05]">
              <div>
                <h3 className="text-2xl font-semibold">
                  Detalle — {order.tableLabel ?? order.tableId}
                </h3>
                <div className="text-sm text-gray-500">
                  {(order.people || []).length} comensal
                  {(order.people || []).length !== 1 ? "es" : ""} •{" "}
                  {order.placedAt
                    ? new Date(String(order.placedAt)).toLocaleString()
                    : ""}
                </div>
              </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => console.log("Cobrar", order._id ?? order.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    Cobrar
                  </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-4">
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-4">
                  {(order.people || []).map((p, idx) => (
                    <PersonGroupCard
                      key={p.id ?? p.name ?? idx}
                      person={p}
                      initials={
                        p.name
                          ? p.name
                              .split(" ")
                              .map((s) => s[0])
                              .slice(0, 2)
                              .join("")
                          : undefined
                      }
                      personTotal={"—"}
                    />
                  ))}
                </div>

                <div className="lg:col-span-4">
                  <div className="hidden lg:block">
                    <PaymentSummary subtotal={"—"} taxes={"—"} total={"—"} />
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-gray-800/50 bg-gradient-to-t from-transparent to-transparent p-3 lg:hidden">
              <div className="max-w-2xl mx-auto">
                <PaymentSummary subtotal={"—"} taxes={"—"} total={"—"} />
              </div>
            </div>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}

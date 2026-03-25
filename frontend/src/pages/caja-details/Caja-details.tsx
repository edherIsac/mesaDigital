import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import POSList, { POSItem } from "../../components/caja/POSList";
import POSSummary from "../../components/caja/POSSummary";
import ComponentCard from "../../components/common/ComponentCard";

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

  const subtotal = MOCK_ITEMS.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const taxes = +(subtotal * 0.1).toFixed(2); // placeholder
  const total = +(subtotal + taxes).toFixed(2);

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
        <div className="lg:col-span-8">
          <div
            ref={dynamicRef}
            style={dynamicHeight ? { height: `${dynamicHeight}px` } : undefined}
          >
            <ComponentCard className="w-full h-full shadow-sm hover:shadow-lg transition-shadow" noHeader fillHeight>
              <div className="h-full flex flex-col min-h-0">
                <div className="shrink-0 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.05]">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-100">Platillos</h3>
                    <div className="text-sm text-gray-400">Lista de productos a cobrar</div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto">
                  <POSList items={MOCK_ITEMS} badgeVariant="solid" badgeColor="success" badgeSize="md" />
                </div>
              </div>
            </ComponentCard>
          </div>
        </div>

        <div className="lg:col-span-4">
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

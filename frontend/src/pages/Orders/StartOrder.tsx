import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router";
import MesaService from "../Admin/Mesas/Mesa.service";
import { Mesa } from "../Admin/Mesas/Mesa.interface";
// Order creation handled elsewhere; page shows header info only for now

export default function StartOrder() {
  const { tableId } = useParams() as { tableId?: string };
  const location = useLocation();

  const initialMesa = (location.state as { mesa?: Mesa } | null | undefined)?.mesa;

  const [mesa, setMesa] = useState<Mesa | null>(initialMesa ?? null);
  const [loading, setLoading] = useState(!initialMesa && !!tableId);
//   const [creating, setCreating] = useState(false);
  const dynamicRef = useRef<HTMLDivElement | null>(null);
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!mesa && tableId) {
      MesaService.fetchMesas()
        .then((list) => {
          if (!mounted) return;
          const found = list.find((t) => t.id === tableId) ?? null;
          setMesa(found);
        })
        .finally(() => {
          if (!mounted) return;
          setLoading(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [tableId, mesa]);

  // no start button on this screen; order creation handled elsewhere

  useEffect(() => {
    const update = () => {
      if (!dynamicRef.current) return;
      const wrapperRect = dynamicRef.current.getBoundingClientRect();
      const avail = window.innerHeight - wrapperRect.top - 24; // 24px bottom spacing
      setDynamicHeight(avail > 0 ? Math.max(avail, 0) : 0);
    };
    update();
    window.addEventListener("resize", update);
    // observe mutations that may change layout
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro) ro.observe(document.body);
    return () => {
      window.removeEventListener("resize", update);
      if (ro) ro.disconnect();
    };
  }, []);

  return (
    <div>
      <PageMeta title="Iniciar comanda" description="Iniciar comanda para una mesa" />
      <PageBreadcrumb pageTitle="Iniciar comanda" />

      <div className="w-full">
        <div className="mt-6">
          <ComponentCard title={mesa?.label ?? "Mesa"} desc={""} noHeader>
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
                  <div className="text-xl font-semibold text-gray-800 dark:text-white/90">{mesa?.label}</div>
                </div>

                <div className="flex gap-6 items-center">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Asientos</div>
                    <div className="font-medium text-gray-800 dark:text-white/90">{mesa?.seats ?? "-"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Zona</div>
                    <div className="font-medium text-gray-800 dark:text-white/90">{mesa?.zone ?? "-"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Estado</div>
                    <div className="mt-1 inline-flex items-center rounded-full bg-brand-50 text-brand-500 px-3 py-1 text-xs font-medium dark:bg-brand-500/15 dark:text-brand-300">
                      Disponible
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ComponentCard>
        </div>
        <div ref={dynamicRef} className="mt-4" style={dynamicHeight ? { height: `${dynamicHeight}px` } : undefined}>
          <ComponentCard className="w-full h-full" noHeader fillHeight>
            <div className="h-full grid min-h-0" style={{ gridTemplateRows: "1fr 8fr 1fr" }}>
              {/* Top row (1fr / ~10%) */}
              <div className="flex items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">Comanda</div>
              </div>

              {/* Middle row (8fr / ~80%) - scrollable list/table of dishes */}
              <div className="overflow-auto min-h-0">
                <div className="space-y-3">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-white/90">Platillo {i + 1}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Descripción breve</div>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">$0.00</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom row (1fr / ~10%) - totals and action buttons (static) */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-xs text-gray-500">Nota: revisa los platillos antes de confirmar</div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">Total: <span className="font-semibold">$0.00</span></div>
                  <button className="inline-flex items-center rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">
                    Colocar comanda
                  </button>
                </div>
              </div>
            </div>
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}

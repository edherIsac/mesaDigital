import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { useEffect, useState, useRef } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { ChevronDownIcon } from "../../icons";
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
  const [people] = useState(() =>
    [
      {
        id: 1,
        name: "Ana",
        orders: [
          { id: 1, name: "Tacos al pastor", qty: 2, note: "Sin cebolla", price: "$6.00", type: "platillo" },
          { id: 2, name: "Coca-Cola", qty: 1, note: "", price: "$1.50", type: "bebida" },
        ],
      },
      {
        id: 2,
        name: "Luis",
        orders: [
          { id: 3, name: "Enchiladas", qty: 1, note: "Extra salsa", price: "$7.00", type: "platillo" },
          { id: 4, name: "Agua mineral", qty: 1, note: "", price: "$1.00", type: "bebida" },
        ],
      },
      {
        id: 3,
        name: "María",
        orders: [
          { id: 5, name: "Sopa", qty: 1, note: "Caliente", price: "$5.00", type: "platillo" },
        ],
      },
    ] as {
      id: number;
      name: string;
      orders: { id: number; name: string; qty: number; note: string; price: string; type: string }[];
    }[]
  );
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

              {/* Middle row (8fr / ~80%) - scrollable table of dishes */}
              <div className="h-full overflow-auto min-h-0">
                <div className="h-full overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                  <div className="max-w-full overflow-x-auto h-full">
                    <Table className="table-fixed">
                      <colgroup>
                        <col style={{ width: "55%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "25%" }} />
                        <col style={{ width: "10%" }} />
                      </colgroup>
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                      <TableRow>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                          Item
                        </TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                          Cant
                        </TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                          Nota
                        </TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                          Precio
                        </TableCell>
                      </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {people.map((person) => {
                        const personTotal = person.orders.reduce((s, o) => s + parseFloat(o.price.replace(/[^0-9.-]+/g, "")), 0);
                        const isOpen = !!openRows[person.id];
                        return (
                          <>
                            <TableRow>
                              <TableCell className="px-5 py-4 sm:px-6 text-start">
                                <button
                                  onClick={() => toggleRow(person.id)}
                                  aria-expanded={isOpen}
                                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-white/90"
                                >
                                  <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "-rotate-180 text-brand-500" : ""}`} />
                                  {person.name}
                                </button>
                              </TableCell>

                              <TableCell className="px-4 py-3 text-theme-sm text-gray-700">{person.orders.length}</TableCell>
                              <TableCell className="px-4 py-3 text-theme-sm text-gray-500">&nbsp;</TableCell>
                              <TableCell className="px-4 py-3 text-theme-sm text-gray-500">${personTotal.toFixed(2)}</TableCell>
                            </TableRow>

                            {isOpen &&
                              person.orders.map((o) => (
                                <TableRow key={o.id}>
                                  <TableCell className="px-5 py-2 sm:px-6 text-start text-sm text-gray-700">
                                    <div className="ml-6">
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm font-medium text-gray-800 dark:text-white/90">{o.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{o.type}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-4 py-2 text-theme-sm text-gray-700">{o.qty}</TableCell>
                                  <TableCell className="px-4 py-2 text-theme-sm text-gray-500">{o.note}</TableCell>
                                  <TableCell className="px-4 py-2 text-theme-sm text-gray-500">{o.price}</TableCell>
                                </TableRow>
                              ))}
                          </>
                        );
                      })}
                    </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Bottom row (1fr / ~10%) - totals and action buttons (static) */}
              <div className="flex items-center justify-between px-4 py-3">
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

import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { Fragment, useEffect, useState, useRef } from "react";
import { Modal } from "../../components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { ChevronDownIcon } from "../../icons";
import { useParams, useLocation, useNavigate } from "react-router";
import MesaService from "../Admin/Mesas/Mesa.service";
import { Mesa } from "../Admin/Mesas/Mesa.interface";
// Order creation handled elsewhere; page shows header info only for now

export default function StartOrder() {
  const { tableId } = useParams() as { tableId?: string };
  const location = useLocation();
  const navigate = useNavigate();

  const initialMesa = (location.state as { mesa?: Mesa } | null | undefined)?.mesa;

  const [mesa, setMesa] = useState<Mesa | null>(initialMesa ?? null);
  const [loading, setLoading] = useState(!initialMesa && !!tableId);
//   const [creating, setCreating] = useState(false);
  const dynamicRef = useRef<HTMLDivElement | null>(null);
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);
  const [people, setPeople] = useState(() =>
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const productImages = [
    "/images/product/product-01.jpg",
    "/images/product/product-02.jpg",
    "/images/product/product-03.jpg",
    "/images/product/product-04.jpg",
    "/images/product/product-05.jpg",
  ];
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setOpenRows((prev) => (prev[id] ? {} : { [id]: true }));
  };

  const addDish = (personId: number) => {
    setPeople((prev) => {
      const maxOrderId = prev.reduce((m, p) => {
        const pMax = p.orders.reduce((mm, o) => Math.max(mm, o.id), 0);
        return Math.max(m, pMax);
      }, 0);
      const newId = maxOrderId + 1;
      const newOrder = { id: newId, name: `Nuevo platillo`, qty: 1, note: "", price: "$0.00", type: "platillo" };
      return prev.map((p) => (p.id === personId ? { ...p, orders: [...p.orders, newOrder] } : p));
    });
    setOpenRows({ [personId]: true });
  };

  const openAddPersonDialog = () => {
    setNewPersonName(`Persona ${people.length + 1}`);
    setIsDialogOpen(true);
    // focus after modal opens
    // focus and select as soon as the input mounts (before dialog animation finishes)
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select?.();
    } else {
      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select?.();
      });
    }
  };

  const handleAddPerson = () => {
    const name = newPersonName.trim() || `Persona ${people.length + 1}`;
    const newId = (people.reduce((m, p) => Math.max(m, p.id), 0) || 0) + 1;
    const newPerson = { id: newId, name, orders: [] };
    setPeople((prev) => [...prev, newPerson]);
    setOpenRows({ [newId]: true });
    setIsDialogOpen(false);
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
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Iniciar comanda</h2>
        </div>

        <nav>
          <ol className="flex items-center gap-1.5">
            <li>
              <a
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
                href="/"
              >
                Home
                <svg
                  className="stroke-current"
                  width="17"
                  height="16"
                  viewBox="0 0 17 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                    stroke=""
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </li>
            <li className="text-sm text-gray-800 dark:text-white/90">Iniciar comanda</li>
          </ol>
        </nav>
      </div>

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
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">Comanda</div>
                <div>
                  <button
                    onClick={openAddPersonDialog}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
                  >
                    + Agregar persona
                  </button>
                </div>
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
                          <Fragment key={person.id}>
                            <TableRow
                              className={`transition-colors duration-150 ${isOpen ? 'bg-white/[0.03] dark:bg-white/[0.03]' : 'hover:bg-white/[0.02] dark:hover:bg-white/[0.01]'}`}
                              onClick={() => toggleRow(person.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleRow(person.id);
                                }
                              }}
                              aria-expanded={isOpen}
                            >
                              <TableCell className="px-5 py-4 sm:px-6 text-start">
                                <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-white/90">
                                  <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "-rotate-180 text-brand-500" : ""}`} />
                                  {person.name}
                                </div>
                              </TableCell>

                              <TableCell className="px-4 py-3 text-theme-sm text-gray-700">{person.orders.length}</TableCell>
                              <TableCell className="px-4 py-3 text-theme-sm text-gray-500">&nbsp;</TableCell>
                              <TableCell className="px-4 py-3 text-theme-sm text-gray-500">${personTotal.toFixed(2)}</TableCell>
                            </TableRow>

                            {person.orders.map((o) => {
                                const img = productImages[(o.id - 1) % productImages.length];
                                return (
                                  <TableRow key={o.id} className={isOpen ? 'bg-white/[0.02] dark:bg-white/[0.01]' : ''}>
                                    <TableCell className="px-5 py-0 sm:px-6 text-start text-sm text-gray-700">
                                      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                                        <div className="py-2 flex items-center gap-3">
                                          <div className="w-12 h-12 overflow-hidden rounded-full">
                                            <img width={48} height={48} src={img} alt={o.name} />
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium text-gray-800 dark:text-white/90">{o.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{o.type}</div>
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-0 text-theme-sm text-gray-700">
                                      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                                        <div className="py-2">{o.qty}</div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-0 text-theme-sm text-gray-500">
                                      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                                        <div className="py-2">{o.note}</div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-0 text-theme-sm text-gray-500">
                                      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                                        <div className="py-2">{o.price}</div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}

                            {/* Add-row: collapsible with the group's items */}
                            <TableRow key={`add-${person.id}`} className={isOpen ? 'bg-white/[0.02] dark:bg-white/[0.01]' : ''}>
                              <TableCell className="px-5 py-0 sm:px-6 text-start text-sm text-gray-700">
                                <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                                  <div className="py-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); addDish(person.id); }}
                                      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-brand-500 hover:bg-brand-50 dark:hover:bg-white/[0.02]"
                                    >
                                      + Agregar platillo
                                    </button>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-0 text-theme-sm text-gray-700">
                                <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                                  <div className="py-2">&nbsp;</div>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-0 text-theme-sm text-gray-500">
                                <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                                  <div className="py-2">&nbsp;</div>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-0 text-theme-sm text-gray-500">
                                <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                                  <div className="py-2">&nbsp;</div>
                                </div>
                              </TableCell>
                            </TableRow>
                          </Fragment>
                        );
                      })}
                    </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              <Modal isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} className="max-w-[420px] p-6">
                <div className="flex flex-col px-2">
                  <div>
                    <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">Agregar persona</h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ingresa el nombre de la persona en la mesa.</p>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nombre</label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddPerson();
                        }
                      }}
                      className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setIsDialogOpen(false)}
                      className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddPerson}
                      className="inline-flex items-center rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </Modal>

              {/* Bottom row (1fr / ~10%) - totals and action buttons (static) */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-xs text-gray-500">Nota: revisa los platillos antes de confirmar</div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">Total: <span className="font-semibold">$0.00</span></div>
                  <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
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

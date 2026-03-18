import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { useEffect, useState, useRef } from "react";
import { Modal } from "../../components/ui/modal";
import { ChevronDownIcon } from "../../icons";
import { useParams, useLocation, useNavigate } from "react-router";
import MesaService from "../Admin/Mesas/Mesa.service";
import { Mesa } from "../Admin/Mesas/Mesa.interface";
import ProductSelectorDialog from "../../components/orders/ProductSelectorDialog";
import { Product } from "../Admin/Products/Product.interface";
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
  const [people, setPeople] = useState<{
    id: number;
    name: string;
    orders: { id: number; productId?: string; coverImage?: string; name: string; qty: number; note: string; unitPrice: number; type: string }[];
  }[]>([]);
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

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [personToAddFor, setPersonToAddFor] = useState<number | null>(null);
  const [pendingSelection, setPendingSelection] = useState<
    { product: Product; qty: number; note: string }[] | null
  >(null);

  const toggleRow = (id: number) => {
    setOpenRows((prev) => (prev[id] ? {} : { [id]: true }));
  };
  const addDish = (personId: number) => {
    setPersonToAddFor(personId);
    setProductDialogOpen(true);
  };

  const changeQty = (personId: number, orderId: number, delta: number) => {
    setPeople((prev) =>
      prev.map((p) => {
        if (p.id !== personId) return p;
        return {
          ...p,
          orders: p.orders.map((o) =>
            o.id === orderId ? { ...o, qty: Math.max(1, (o.qty || 1) + delta) } : o,
          ),
        };
      }),
    );
  };

  // Called by ProductSelectorDialog: keep selection in a pending state so
  // we can ask for note and quantity before adding to the comanda.
  const handleProductsSelected = (products: Product[]) => {
    if (!personToAddFor) return;
    setPendingSelection(products.map((p) => ({ product: p, qty: 1, note: "" })));
    setProductDialogOpen(false);
  };

  const updatePendingQty = (index: number, delta: number) => {
    setPendingSelection((prev) =>
      prev
        ? prev.map((it, i) => (i === index ? { ...it, qty: Math.max(1, it.qty + delta) } : it))
        : prev,
    );
  };

  const updatePendingNote = (index: number, note: string) => {
    setPendingSelection((prev) => (prev ? prev.map((it, i) => (i === index ? { ...it, note } : it)) : prev));
  };

  const NOTE_SUGGESTIONS = ["Sin cebolla", "Poco chile", "Sin cilantro", "Extra salsa", "Sin sal"];

  const finalizeAddProducts = () => {
    if (!personToAddFor || !pendingSelection) return;
    setPeople((prev) => {
      const maxOrderId = prev.reduce((m, p) => {
        const pMax = p.orders.reduce((mm, o) => Math.max(mm, o.id), 0);
        return Math.max(m, pMax);
      }, 0);
      let nextId = maxOrderId + 1;
      const additions = pendingSelection.map(({ product, qty, note }) => ({
        id: nextId++,
        productId: product.id,
        coverImage: product.coverImage ?? undefined,
        name: product.name,
        qty,
        note,
        unitPrice: product.price ?? 0,
        type: "platillo",
      }));
      return prev.map((p) => (p.id === personToAddFor ? { ...p, orders: [...p.orders, ...additions] } : p));
    });
    setOpenRows({ [personToAddFor]: true });
    setPersonToAddFor(null);
    setPendingSelection(null);
    setProductDialogOpen(false);
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

  const comandaTotal = people.reduce(
    (sum, p) => sum + p.orders.reduce((s, o) => s + ((o.unitPrice ?? 0) * (o.qty ?? 1)), 0),
    0,
  );

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
            <div className="h-full flex flex-col min-h-0">

              {/* ── Header ─────────────────────────────────────── */}
              <div className="shrink-0 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-semibold text-gray-800 dark:text-white/90">Comanda</span>
                  <span className="rounded-full bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-300">
                    {people.length} persona{people.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  onClick={openAddPersonDialog}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar persona
                </button>
              </div>

              {/* ── Person cards (scrollable) ────────────────── */}
              <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-3 pr-0.5">
                {people.map((person) => {
                  const personTotal = person.orders.reduce(
                    (s, o) => s + ((o.unitPrice ?? 0) * (o.qty ?? 1)),
                    0,
                  );
                  const isOpen = !!openRows[person.id];
                  const initials = person.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div key={person.id} className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.07]">

                      {/* Person header */}
                      <button
                        type="button"
                        onClick={() => toggleRow(person.id)}
                        aria-expanded={isOpen}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                          ${isOpen
                            ? "bg-brand-50/70 dark:bg-brand-500/10"
                            : "bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                          }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold
                            ${isOpen
                              ? "bg-brand-500 text-white"
                              : "bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300"
                            }`}
                        >
                          {initials}
                        </div>
                        <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-white/90">
                          {person.name}
                        </span>
                        <span className="rounded-full bg-gray-200/80 dark:bg-white/[0.08] px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400 shrink-0">
                          {person.orders.length} {person.orders.length === 1 ? "item" : "items"}
                        </span>
                        <span className="w-16 shrink-0 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                          ${personTotal.toFixed(2)}
                        </span>
                        <ChevronDownIcon
                          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-brand-500" : ""}`}
                        />
                      </button>

                      {/* Expanded items */}
                      {isOpen && (
                        <div className="bg-white dark:bg-white/[0.01]">

                          {/* Column labels */}
                          <div
                            className="grid items-center gap-3 border-b border-gray-50 dark:border-white/[0.04] px-4 py-1.5 bg-gray-50/60 dark:bg-white/[0.01]"
                            style={{ gridTemplateColumns: "2.5rem 1fr 2.25rem 3.5rem 2.25rem 8rem 6rem 4.5rem" }}
                          >
                            <div />
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Platillo</div>
                            <div />
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center">Cant</div>
                            <div />
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Nota</div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Precio</div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Importe</div>
                          </div>

                          {/* Item rows */}
                          {person.orders.map((o) => {
                            const img = o.coverImage ?? productImages[(o.id - 1) % productImages.length];
                            return (
                              <div
                                key={o.id}
                                className="grid items-center gap-3 border-b border-gray-50 dark:border-white/[0.03] px-4 py-2.5 last:border-b-0 hover:bg-gray-50/40 dark:hover:bg-white/[0.02] transition-colors"
                                style={{ gridTemplateColumns: "2.5rem 1fr 2.25rem 3.5rem 2.25rem 8rem 6rem 4.5rem" }}
                              >
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                  <img src={img} alt={o.name} width={40} height={40} className="h-full w-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{o.name}</div>
                                  <span className="mt-0.5 inline-block rounded-full bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                                    {o.type}
                                  </span>
                                </div>

                                {/* Decrement button */}
                                <div className="flex items-center justify-center">
                                  <button
                                    type="button"
                                    aria-label={`Disminuir cantidad de ${o.name}`}
                                    onClick={(e) => { e.stopPropagation(); changeQty(person.id, o.id, -1); }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={(o.qty || 1) <= 1}
                                  >
                                    −
                                  </button>
                                </div>

                                {/* Qty */}
                                <div className="flex justify-center">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15 text-xs font-semibold text-brand-600 dark:text-brand-300">
                                    {o.qty}
                                  </span>
                                </div>

                                {/* Increment button */}
                                <div className="flex items-center justify-center">
                                  <button
                                    type="button"
                                    aria-label={`Aumentar cantidad de ${o.name}`}
                                    onClick={(e) => { e.stopPropagation(); changeQty(person.id, o.id, +1); }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.02]"
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="truncate text-xs italic text-gray-400 dark:text-gray-500">
                                  {o.note || "—"}
                                </div>
                                <div className="text-right text-sm text-gray-700 dark:text-gray-200">
                                  {`$${((o.unitPrice ?? 0)).toFixed(2)}`}
                                </div>
                                <div className="text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                                  {`$${(((o.unitPrice ?? 0) * (o.qty ?? 1))).toFixed(2)}`}
                                </div>
                              </div>
                            );
                          })}

                          {/* Add dish */}
                          <div className="px-4 py-2.5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); addDish(person.id); }}
                              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-brand-300 dark:border-brand-700 px-3 py-1.5 text-sm font-medium text-brand-500 dark:text-brand-400 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                              Agregar platillo
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Footer ─────────────────────────────────────── */}
              <div className="shrink-0 flex items-center justify-between gap-4 border-t border-gray-100 dark:border-white/[0.05] pt-3 mt-1">
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">Total comanda</div>
                  <div className="text-lg font-bold text-gray-800 dark:text-white/90">{`$${comandaTotal.toFixed(2)}`}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Colocar comanda
                  </button>
                </div>
              </div>
            </div>

            {/* Modals */}
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

            <ProductSelectorDialog
              isOpen={productDialogOpen}
              onClose={() => {
                setProductDialogOpen(false);
                setPersonToAddFor(null);
              }}
              onConfirm={handleProductsSelected}
            />

            {/* Confirmación: nota y cantidad por producto seleccionado */}
            {pendingSelection && (
              <Modal
                isOpen={!!pendingSelection}
                onClose={() => { setPendingSelection(null); setPersonToAddFor(null); }}
                showCloseButton={false}
                className="!max-w-2xl !p-0 !rounded-2xl overflow-hidden"
              >
                <div className="flex flex-col" style={{ maxHeight: "90vh" }}>

                  {/* ── Header ─────────────────────────────────────── */}
                  <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/[0.07] bg-white dark:bg-gray-900">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15">
                      <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 leading-tight">
                        Detalles de platillos
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Ajusta cantidad y nota antes de agregar a la comanda
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-50 dark:bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
                      {pendingSelection.length} platillo{pendingSelection.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={() => { setPendingSelection(null); setPersonToAddFor(null); }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z" />
                      </svg>
                    </button>
                  </div>

                  {/* ── Product list ───────────────────────────────── */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 dark:bg-white/[0.01]">
                    {pendingSelection.map((it, i) => (
                      <div
                        key={it.product.id}
                        className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900 overflow-hidden shadow-sm"
                      >
                        {/* Product info row */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/[0.05]">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                            <img
                              src={it.product.coverImage ?? productImages[i % productImages.length]}
                              alt={it.product.name}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-[10px] font-bold text-white backdrop-blur-sm">
                              {i + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-800 dark:text-white/90 truncate leading-tight">
                              {it.product.name}
                            </div>
                            {it.product.categories && it.product.categories.length > 0 && (
                              <div className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                                {it.product.categories.slice(0, 2).join(" · ")}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-base font-bold text-gray-800 dark:text-white/90">
                              ${(it.product.price ?? 0).toFixed(2)}
                            </div>
                            <div className="text-[11px] text-gray-400 dark:text-gray-500">por unidad</div>
                          </div>
                        </div>

                        {/* Controls row */}
                        <div className="px-4 py-3 flex flex-col sm:flex-row gap-4">

                          {/* Cantidad */}
                          <div className="shrink-0">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Cantidad
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updatePendingQty(i, -1)}
                                disabled={it.qty <= 1}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-lg font-light hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                −
                              </button>
                              <div className="flex h-9 w-14 items-center justify-center rounded-xl border border-brand-200 dark:border-brand-700/50 bg-brand-50 dark:bg-brand-500/10 text-base font-bold text-brand-600 dark:text-brand-300 select-none">
                                {it.qty}
                              </div>
                              <button
                                type="button"
                                onClick={() => updatePendingQty(i, +1)}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-lg font-light hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                +
                              </button>
                              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                                = ${((it.product.price ?? 0) * it.qty).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Nota */}
                          <div className="flex-1 min-w-0">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Nota para cocina
                            </div>
                            <div className="relative">
                              <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              <input
                                type="text"
                                placeholder="ej. Sin cebolla, poco chile…"
                                value={it.note}
                                onChange={(e) => updatePendingNote(i, e.target.value)}
                                className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-8 pr-3 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:focus:border-brand-700 transition-colors"
                              />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {NOTE_SUGGESTIONS.map((s) => {
                                const active = it.note === s;
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => updatePendingNote(i, active ? "" : s)}
                                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all
                                      ${active
                                        ? "border-brand-400 bg-brand-500 text-white dark:border-brand-500"
                                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600"
                                      }`}
                                  >
                                    {active && (
                                      <svg className="mr-1 w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Footer ─────────────────────────────────────── */}
                  <div className="shrink-0 flex items-center justify-between gap-4 border-t border-gray-100 dark:border-white/[0.07] px-5 py-4 bg-white dark:bg-gray-900">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-800 dark:text-white/90">
                        {pendingSelection.reduce((s, it) => s + it.qty, 0)}
                      </span>{" "}
                      ítem{pendingSelection.reduce((s, it) => s + it.qty, 0) !== 1 ? "s" : ""}
                      {" · "}
                      <span className="font-semibold text-gray-800 dark:text-white/90">
                        ${pendingSelection.reduce((s, it) => s + (it.product.price ?? 0) * it.qty, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setPendingSelection(null); setProductDialogOpen(true); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver
                      </button>
                      <button
                        onClick={finalizeAddProducts}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar a comanda
                      </button>
                    </div>
                  </div>
                </div>
              </Modal>
            )}
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}

import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import ProductService from "../Admin/Products/Product.service";
import MesaService from "../Admin/Mesas/Mesa.service";
import OrderService from "./Order.service";
import { Product } from "../Admin/Products/Product.interface";
import { Mesa } from "../Admin/Mesas/Mesa.interface";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { Category, CATEGORY_LABELS } from "../../constants/categories";
import { useLocation, useNavigate, useParams } from "react-router";

// ── Types ──────────────────────────────────────────────────────────────────────
type OrderItem = {
  _id?: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  status?: string;
};

type Order = {
  _id?: string;
  id?: string;
  tableId?: string;
  orderNumber?: string;
  items: OrderItem[];
  status?: string;
  subtotal?: number;
  total?: number;
};

// ── Helpers ─────────────────────────────────────────────────────────────────────
const ITEM_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Pendiente",        cls: "bg-amber-50 text-amber-700 dark:bg-amber-600/30 dark:text-amber-300" },
  sent:       { label: "Enviado a cocina", cls: "bg-blue-50 text-blue-700 dark:bg-blue-600/30 dark:text-blue-300" },
  preparing:  { label: "Preparando",       cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-300" },
  ready:      { label: "Listo",            cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-600/30 dark:text-emerald-300" },
  completed:  { label: "Entregado",        cls: "bg-gray-100 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400" },
  cancelled:  { label: "Cancelado",        cls: "bg-rose-50 text-rose-700 dark:bg-rose-600/30 dark:text-rose-300" },
};

const ORDER_STATUS_MAP: Record<string, { label: string; badgeCls: string }> = {
  pending:          { label: "Pendiente",         badgeCls: "bg-amber-100 text-amber-700 dark:bg-amber-600/30 dark:text-amber-300" },
  sent:             { label: "Enviada a cocina",   badgeCls: "bg-blue-100 text-blue-700 dark:bg-blue-600/30 dark:text-blue-300" },
  ready_for_billing:{ label: "Lista para cobrar",  badgeCls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-600/30 dark:text-emerald-300" },
  completed:        { label: "Completada",         badgeCls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400" },
  cancelled:        { label: "Cancelada",          badgeCls: "bg-rose-100 text-rose-700 dark:bg-rose-600/30 dark:text-rose-300" },
};

function itemKey(it: OrderItem) {
  return it._id ?? `${it.menuItemId ?? ''}-${it.name}`;
}

function getOrderId(o: Order): string | null {
  return (o?._id ?? o?.id) ?? null;
}

// ── Component ────────────────────────────────────────────────────────────────────
export default function TableManage() {
  const navigate = useNavigate();
  const params = useParams();
  const searchParams = new URLSearchParams(useLocation().search);
  const tableId = params.tableId ?? searchParams.get("tableId") ?? undefined;

  // Mesa data
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [mesaLoading, setMesaLoading] = useState(true);

  // Catalogue
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());

  // Order
  const [order, setOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load mesa ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tableId) return setMesaLoading(false);
    let mounted = true;
    setMesaLoading(true);
    MesaService.fetchMesaById(tableId)
      .then((data) => { if (mounted) setMesa(data); })
      .catch(() => { if (mounted) setMesa(null); })
      .finally(() => { if (mounted) setMesaLoading(false); });
    return () => { mounted = false; };
  }, [tableId]);

  // ── Load products ───────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setProductsLoading(true);
    ProductService.fetchProducts(400)
      .then((data) => { if (mounted) setProducts(data ?? []); })
      .catch(() => { if (mounted) setProducts([]); })
      .finally(() => { if (mounted) setProductsLoading(false); });
    return () => { mounted = false; };
  }, []);

  // ── Load active order for this table ───────────────────────────────────────
  useEffect(() => {
    if (!tableId) return setOrderLoading(false);
    let mounted = true;
    setOrderLoading(true);
    OrderService.fetchOrders()
      .then((list) => {
        if (!mounted) return;
        const active = (list ?? []).find((o: Order) => {
          const tid = String(o.tableId ?? "");
          return tid === tableId && o.status !== "completed" && o.status !== "cancelled";
        });
        setOrder(active ?? null);
      })
      .catch(() => { if (mounted) setOrder(null); })
      .finally(() => { if (mounted) setOrderLoading(false); });
    return () => { mounted = false; };
  }, [tableId]);

  // ── Catalogue filters ───────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => (p.categories ?? []).forEach((c) => set.add(c)));
    return Array.from(set).sort((a, b) =>
      (CATEGORY_LABELS[a as Category] || a).localeCompare(CATEGORY_LABELS[b as Category] || b, "es"),
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q);
      const matchCat =
        selectedCats.size === 0 || (p.categories ?? []).some((c) => selectedCats.has(c));
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCats]);

  const toggleCat = (c: string) =>
    setSelectedCats((prev) => {
      const n = new Set(prev);
      if (n.has(c)) { n.delete(c); } else { n.add(c); }
      return n;
    });

  // ── Totals ──────────────────────────────────────────────────────────────────
  const { subtotal, itemCount } = useMemo(() => {
    const items = order?.items ?? [];
    const subtotal = items.reduce(
      (acc, it) => acc + (it.unitPrice ?? 0) * (it.quantity || 1),
      0,
    );
    const itemCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
    return { subtotal, itemCount };
  }, [order]);

  // ── Order mutations ─────────────────────────────────────────────────────────
  const addProduct = async (product: Product) => {
    if (!tableId) return;
    setSaving(true);
    try {
      if (!order) {
        const created = await OrderService.createOrder({
          tableId,
          items: [{ menuItemId: product.id, name: product.name, quantity: 1, unitPrice: product.price, status: "pending" }],
        });
        setOrder(created ?? null);
        return;
      }
      const oid = getOrderId(order)!;
      const existing = order.items.find((it) => it.menuItemId === product.id);
      const items = existing
        ? order.items.map((it) =>
            it.menuItemId === product.id ? { ...it, quantity: (it.quantity || 1) + 1 } : it,
          )
        : [...order.items, { menuItemId: product.id, name: product.name, quantity: 1, unitPrice: product.price, status: "pending" }];
      const updated = await OrderService.updateOrder(oid, { items });
      setOrder(updated ?? null);
    } catch {
      alert("No se pudo agregar el platillo.");
    } finally {
      setSaving(false);
    }
  };

  const changeQty = async (item: OrderItem, delta: number) => {
    if (!order) return;
    setSaving(true);
    try {
      const oid = getOrderId(order)!;
      const items = order.items.map((it) =>
        itemKey(it) === itemKey(item)
          ? { ...it, quantity: Math.max(1, (it.quantity || 1) + delta) }
          : it,
      );
      const updated = await OrderService.updateOrder(oid, { items });
      setOrder(updated ?? null);
    } catch {
      alert("No se pudo actualizar la cantidad.");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item: OrderItem) => {
    if (!order) return;
    setSaving(true);
    try {
      const oid = getOrderId(order)!;
      const items = order.items.filter((it) => itemKey(it) !== itemKey(item));
      const updated = await OrderService.updateOrder(oid, { items });
      setOrder(updated ?? null);
    } catch {
      alert("No se pudo quitar el platillo.");
    } finally {
      setSaving(false);
    }
  };

  const sendToKDS = async () => {
    if (!order) {
      alert("No hay comanda activa.");
      return;
    }
    setSaving(true);
    try {
      const updated = await OrderService.updateOrder(getOrderId(order)!, { status: "sent" });
      setOrder(updated ?? null);
    } catch {
      alert("No se pudo enviar a cocina.");
    } finally {
      setSaving(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return navigate(-1);
    if (!confirm("¿Seguro que deseas cancelar la comanda?")) return;
    setSaving(true);
    try {
      await OrderService.updateOrder(getOrderId(order)!, { status: "cancelled" });
      navigate(-1);
    } catch {
      alert("No se pudo cancelar la comanda.");
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    if (!order) return;
    if (!confirm("¿Finalizar comanda y enviar a caja para cobrar?")) return;
    setSaving(true);
    try {
      const updated = await OrderService.updateOrder(getOrderId(order)!, { status: "ready_for_billing" });
      setOrder(updated ?? null);
      navigate("/caja");
    } catch {
      alert("No se pudo finalizar la comanda.");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived display values ──────────────────────────────────────────────────
  const orderStatus = order?.status ?? "pending";
  const orderStatusInfo = ORDER_STATUS_MAP[orderStatus] ?? { label: orderStatus, badgeCls: "bg-gray-100 text-gray-600" };
  const isFinal = orderStatus === "completed" || orderStatus === "cancelled" || orderStatus === "ready_for_billing";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageMeta title="Gestionar mesa | mesaDigital" description="Gestión de comanda por mesa" />
      <PageBreadcrumb pageTitle={mesa ? `Mesa ${mesa.label}` : "Gestión de mesa"} />

      <div className="px-5 py-7 xl:px-8 xl:py-10">

        {/* ── Header: mesa info ─────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.04]">
          {mesaLoading ? (
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : mesa ? (
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Mesa</span>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{mesa.label}</div>
              </div>
              {mesa.zone && (
                <div className="border-l border-gray-200 pl-4 dark:border-gray-700">
                  <span className="text-xs text-gray-400">Zona</span>
                  <div className="font-semibold text-gray-800 dark:text-white/80">{mesa.zone}</div>
                </div>
              )}
              {mesa.seats && (
                <div className="border-l border-gray-200 pl-4 dark:border-gray-700">
                  <span className="text-xs text-gray-400">Asientos</span>
                  <div className="font-semibold text-gray-800 dark:text-white/80">{mesa.seats}</div>
                </div>
              )}
              <div className="border-l border-gray-200 pl-4 dark:border-gray-700">
                <span className="text-xs text-gray-400">Estado</span>
                <div>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                    mesa.available
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-600/30 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-600/30 dark:text-rose-300"
                  }`}>
                    {mesa.available ? "Disponible" : "No disponible"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Sin información de mesa</div>
          )}
          {order && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{order.orderNumber ?? ""}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${orderStatusInfo.badgeCls}`}>
                {orderStatusInfo.label}
              </span>
            </div>
          )}
        </div>

        {/* ── Body: comanda + sidebar ───────────────────────────────────────── */}
        <div className="flex gap-6">

          {/* ── Left: comanda (carrito) ─────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col">

            {orderLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            ) : (
              <>
                {/* Item list */}
                <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    <h2 className="font-semibold text-gray-800 dark:text-white/90">
                      Comanda{" "}
                      {itemCount > 0 && (
                        <span className="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                          {itemCount} ítem{itemCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </h2>
                  </div>

                  {!order || order.items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-14 text-gray-400 dark:text-gray-500">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="opacity-40">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span className="text-sm">Sin platillos. Agrégalos desde la carta →</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {order.items.map((it) => {
                        const statusInfo = ITEM_STATUS_MAP[it.status ?? "pending"] ?? ITEM_STATUS_MAP.pending;
                        const lineTotal = (it.unitPrice ?? 0) * (it.quantity || 1);
                        const editable = !isFinal && it.status !== "completed" && it.status !== "cancelled";
                        return (
                          <div key={itemKey(it)} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                            {/* Name + status */}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 dark:text-white/90 truncate">{it.name}</div>
                              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusInfo.cls}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            {/* Unit price */}
                            <div className="w-20 text-right text-xs text-gray-500 dark:text-gray-400">
                              ${(it.unitPrice ?? 0).toFixed(2)} c/u
                            </div>
                            {/* Qty controls */}
                            <div className="flex items-center gap-1">
                              <button
                                disabled={!editable || saving}
                                onClick={() => changeQty(it, -1)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 dark:border-gray-700 dark:bg-white/[0.04] dark:text-white/70"
                              >−</button>
                              <span className="w-7 text-center text-sm font-semibold text-gray-800 dark:text-white/90">{it.quantity}</span>
                              <button
                                disabled={!editable || saving}
                                onClick={() => changeQty(it, 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 dark:border-gray-700 dark:bg-white/[0.04] dark:text-white/70"
                              >+</button>
                            </div>
                            {/* Line total */}
                            <div className="w-20 text-right font-semibold text-gray-800 dark:text-white/80">
                              ${lineTotal.toFixed(2)}
                            </div>
                            {/* Remove */}
                            <button
                              disabled={!editable || saving}
                              onClick={() => removeItem(it)}
                              title="Quitar platillo"
                              className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-gray-400 hover:border-rose-300 hover:text-rose-600 disabled:opacity-30 dark:hover:text-rose-400"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Subtotal ({itemCount} ítem{itemCount !== 1 ? "s" : ""})</span>
                    <span className="font-medium text-gray-800 dark:text-white/80">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                    <span className="text-base font-bold text-gray-800 dark:text-white">Total</span>
                    <span className="text-xl font-bold text-brand-600 dark:text-brand-400">${subtotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  {/* Send to KDS */}
                  <Button
                    disabled={saving || !order || order.items.length === 0 || isFinal}
                    onClick={sendToKDS}
                    startIcon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22 12L12 2 2 12h3v8a1 1 0 001 1h5v-6h2v6h5a1 1 0 001-1v-8h3z" fill="currentColor"/>
                      </svg>
                    }
                  >
                    Enviar a KDS
                  </Button>

                  {/* Finalize and go to caja */}
                  <Button
                    disabled={saving || !order || order.items.length === 0 || isFinal}
                    onClick={finalize}
                    variant="outline"
                    startIcon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    }
                  >
                    Finalizar y cobrar
                  </Button>

                  {/* Cancel */}
                  <button
                    disabled={saving}
                    onClick={cancelOrder}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-40 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-600/10"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                    Cancelar comanda
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Right sidebar: product catalogue ────────────────────────────── */}
          <aside className="flex w-80 flex-shrink-0 flex-col gap-3">

            {/* Search */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-white/[0.04]">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Buscar platillo
              </label>
              <Input
                placeholder="Nombre o descripción…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {/* Category toggles */}
              {categories.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Categorías
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCat(c)}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                          selectedCats.has(c)
                            ? "bg-brand-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-white/70 dark:hover:bg-gray-700"
                        }`}
                      >
                        {CATEGORY_LABELS[c as Category] ?? c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product list */}
            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
              {productsLoading ? (
                <div className="flex flex-col gap-2 p-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex animate-pulse items-center gap-3 rounded-lg p-2">
                      <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">Sin resultados</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredProducts.map((p) => {
                    const inCart = order?.items.some((it) => it.menuItemId === p.id) ?? false;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 bg-white px-3 py-2.5 transition-colors hover:bg-gray-50 dark:bg-transparent dark:hover:bg-white/[0.03]"
                      >
                        {/* Thumb */}
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                          {p.coverImage ? (
                            <img src={p.coverImage} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                              {(p.name[0] ?? "P").toUpperCase()}
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">{p.name}</div>
                          <div className="text-xs font-semibold text-brand-600 dark:text-brand-400">${p.price.toFixed(2)}</div>
                        </div>
                        {/* Add button */}
                        <button
                          disabled={saving}
                          onClick={() => addProduct(p)}
                          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-lg font-bold transition-colors disabled:opacity-40 ${
                            inCart
                              ? "bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-500/20 dark:text-brand-400"
                              : "bg-brand-500 text-white hover:bg-brand-600"
                          }`}
                          title={inCart ? "Agregar otro" : "Agregar"}
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

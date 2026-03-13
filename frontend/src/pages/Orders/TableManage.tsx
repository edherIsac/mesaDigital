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

type Seat = {
  seatNumber: number;
  name?: string;
  items: OrderItem[];
  collapsed?: boolean;
};

type Order = {
  _id?: string;
  id?: string;
  tableId?: string;
  orderNumber?: string;
  items: OrderItem[];
  seats?: Seat[];
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
  const [activeSeatIndex, setActiveSeatIndex] = useState<number>(0);

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

  // ── Totals + flattened items (supports seats) ──────────────────────────────
  const { subtotal, itemCount, flatItems } = useMemo(() => {
    const items = order?.seats && order.seats.length > 0
      ? order.seats.flatMap((s) => s.items ?? [])
      : order?.items ?? [];
    const subtotal = items.reduce((acc, it) => acc + (it.unitPrice ?? 0) * (it.quantity || 1), 0);
    const itemCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
    return { subtotal, itemCount, flatItems: items };
  }, [order]);

  const isInCart = (menuItemId?: string) => {
    if (!order || !menuItemId) return false;
    if (order.seats && order.seats.length > 0) {
      return order.seats.some((s) => (s.items ?? []).some((it) => it.menuItemId === menuItemId));
    }
    return (order.items ?? []).some((it) => it.menuItemId === menuItemId);
  };

  // ── Order mutations ─────────────────────────────────────────────────────────
  const addProduct = async (product: Product) => {
    if (!tableId) return;
    setSaving(true);
    try {
      // If there is no order at all, create a client-side draft (in-memory)
      if (!order) {
        const draft: Order = {
          items: [{ menuItemId: product.id, name: product.name, quantity: 1, unitPrice: product.price, status: "pending" }],
        };
        setOrder(draft);
        return;
      }

      const oid = getOrderId(order);

      // Local draft update (not persisted)
      if (!oid) {
        setOrder((prev) => {
          if (!prev) return prev;
          // If seats exist, add to active seat
          if (prev.seats && prev.seats.length > 0) {
            const idx = Math.max(0, Math.min(activeSeatIndex, prev.seats.length - 1));
            const seat = prev.seats[idx] ?? { seatNumber: idx + 1, name: `Persona ${idx + 1}`, items: [] };
            const existing = (seat.items ?? []).find((it) => it.menuItemId === product.id);
            const newSeatItems = existing
              ? (seat.items ?? []).map((it) => (it.menuItemId === product.id ? { ...it, quantity: (it.quantity || 1) + 1 } : it))
              : [...(seat.items ?? []), { menuItemId: product.id, name: product.name, quantity: 1, unitPrice: product.price, status: "pending" }];
            const newSeats = prev.seats.map((s, i) => (i === idx ? { ...s, items: newSeatItems } : s));
            return { ...prev, seats: newSeats };
          }

          // Fallback: top-level items
          const existing = (prev.items ?? []).find((it) => it.menuItemId === product.id);
          const items = existing
            ? (prev.items ?? []).map((it) => (it.menuItemId === product.id ? { ...it, quantity: (it.quantity || 1) + 1 } : it))
            : [...(prev.items ?? []), { menuItemId: product.id, name: product.name, quantity: 1, unitPrice: product.price, status: "pending" }];
          return { ...prev, items };
        });
        return;
      }

      // Persisted order: update via API
      if (order.seats && order.seats.length > 0) {
        const idx = Math.max(0, Math.min(activeSeatIndex, order.seats.length - 1));
        const seat = order.seats[idx] ?? { seatNumber: idx + 1, name: `Persona ${idx + 1}`, items: [] };
        const existing = (seat.items ?? []).find((it) => it.menuItemId === product.id);
        const newSeatItems = existing
          ? (seat.items ?? []).map((it) => (it.menuItemId === product.id ? { ...it, quantity: (it.quantity || 1) + 1 } : it))
          : [...(seat.items ?? []), { menuItemId: product.id, name: product.name, quantity: 1, unitPrice: product.price, status: "pending" }];
        const seats = order.seats.map((s, i) => (i === idx ? { ...s, items: newSeatItems } : s));
        const updated = await OrderService.updateOrder(oid, { seats });
        setOrder(updated ?? null);
        return;
      }

      // Persisted + no seats: top-level items
      const existing = (order.items ?? []).find((it) => it.menuItemId === product.id);
      const items = existing
        ? (order.items ?? []).map((it) => (it.menuItemId === product.id ? { ...it, quantity: (it.quantity || 1) + 1 } : it))
        : [...(order.items ?? []), { menuItemId: product.id, name: product.name, quantity: 1, unitPrice: product.price, status: "pending" }];
      const updated = await OrderService.updateOrder(oid, { items });
      setOrder(updated ?? null);
    } catch {
      alert("No se pudo agregar el platillo.");
    } finally {
      setSaving(false);
    }
  };

  const changeQty = async (item: OrderItem, delta: number, seatIndex?: number) => {
    if (!order) return;
    setSaving(true);
    try {
      const oid = getOrderId(order);
      // Local draft update
      if (!oid) {
        setOrder((prev) => {
          if (!prev) return prev;
          // If seats exist, update the seat's item
          if (prev.seats && prev.seats.length > 0) {
            const idx = typeof seatIndex === "number" ? seatIndex : activeSeatIndex;
            const newSeats = prev.seats.map((s, i) => {
              if (i !== idx) return s;
              return { ...s, items: (s.items ?? []).map((it) =>
                itemKey(it) === itemKey(item) ? { ...it, quantity: Math.max(1, (it.quantity || 1) + delta) } : it,
              ) };
            });
            return { ...prev, seats: newSeats };
          }

          const items = (prev.items ?? []).map((it) =>
            itemKey(it) === itemKey(item) ? { ...it, quantity: Math.max(1, (it.quantity || 1) + delta) } : it,
          );
          return { ...prev, items };
        });
        return;
      }

      // Persisted order
      if (order.seats && order.seats.length > 0) {
        const idx = typeof seatIndex === "number" ? seatIndex : activeSeatIndex;
        const seats = order.seats.map((s, i) => {
          if (i !== idx) return s;
          return { ...s, items: (s.items ?? []).map((it) =>
            itemKey(it) === itemKey(item) ? { ...it, quantity: Math.max(1, (it.quantity || 1) + delta) } : it,
          ) };
        });
        const updated = await OrderService.updateOrder(oid, { seats });
        setOrder(updated ?? null);
        return;
      }

      const items = (order.items ?? []).map((it) =>
        itemKey(it) === itemKey(item) ? { ...it, quantity: Math.max(1, (it.quantity || 1) + delta) } : it,
      );
      const updated = await OrderService.updateOrder(oid, { items });
      setOrder(updated ?? null);
    } catch {
      alert("No se pudo actualizar la cantidad.");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item: OrderItem, seatIndex?: number) => {
    if (!order) return;
    setSaving(true);
    try {
      const oid = getOrderId(order);
      if (!oid) {
        setOrder((prev) => {
          if (!prev) return prev;
          if (prev.seats && prev.seats.length > 0) {
            const idx = typeof seatIndex === "number" ? seatIndex : activeSeatIndex;
            const newSeats = prev.seats.map((s, i) => (i === idx ? { ...s, items: (s.items ?? []).filter((it) => itemKey(it) !== itemKey(item)) } : s));
            return { ...prev, seats: newSeats };
          }
          const items = (prev.items ?? []).filter((it) => itemKey(it) !== itemKey(item));
          return { ...prev, items };
        });
        return;
      }

      if (order.seats && order.seats.length > 0) {
        const idx = typeof seatIndex === "number" ? seatIndex : activeSeatIndex;
        const seats = order.seats.map((s, i) => (i === idx ? { ...s, items: (s.items ?? []).filter((it) => itemKey(it) !== itemKey(item)) } : s));
        const updated = await OrderService.updateOrder(oid, { seats });
        setOrder(updated ?? null);
        return;
      }

      const items = (order.items ?? []).filter((it) => itemKey(it) !== itemKey(item));
      const updated = await OrderService.updateOrder(oid, { items });
      setOrder(updated ?? null);
    } catch {
      alert("No se pudo quitar el platillo.");
    } finally {
      setSaving(false);
    }
  };

  const addSeat = async () => {
    if (!order) {
      setOrder({ items: [], seats: [{ seatNumber: 1, name: "Persona 1", items: [] }] });
      setActiveSeatIndex(0);
      return;
    }
    setSaving(true);
    try {
      const oid = getOrderId(order);
      // If no seats yet, convert existing top-level items into the first seat
      if (!order.seats || order.seats.length === 0) {
        const firstSeat: Seat = { seatNumber: 1, name: "Persona 1", items: order.items ?? [] };
        const seats = [firstSeat];
        if (!oid) {
          setOrder((prev) => (prev ? { ...prev, seats, items: [] } : prev));
        } else {
          const updated = await OrderService.updateOrder(oid, { seats });
          setOrder(updated ?? null);
        }
        setActiveSeatIndex(0);
        return;
      }

      // Add a new empty seat
      const lastNumber = Math.max(...(order.seats.map((s) => s.seatNumber) || [0]));
      const newSeat: Seat = { seatNumber: lastNumber + 1, name: `Persona ${lastNumber + 1}`, items: [] };
      const seats = [...(order.seats ?? []), newSeat];
      if (!oid) {
        setOrder((prev) => (prev ? { ...prev, seats } : prev));
        setActiveSeatIndex(seats.length - 1);
      } else {
        const updated = await OrderService.updateOrder(oid, { seats });
        setOrder(updated ?? null);
        setActiveSeatIndex(seats.length - 1);
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo crear la persona.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSeatCollapse = async (seatIndex: number) => {
    if (!order) return;
    const oid = getOrderId(order);
    if (!oid) {
      setOrder((prev) => {
        if (!prev) return prev;
        const seats = (prev.seats ?? []).map((s, i) => (i === seatIndex ? { ...s, collapsed: !s.collapsed } : s));
        return { ...prev, seats };
      });
      return;
    }
    setSaving(true);
    try {
      const seats = order.seats?.map((s, i) => (i === seatIndex ? { ...s, collapsed: !s.collapsed } : s)) ?? [];
      const updated = await OrderService.updateOrder(oid, { seats });
      setOrder(updated ?? null);
    } catch (e) {
      console.error(e);
      alert("No se pudo cambiar el estado de la persona.");
    } finally {
      setSaving(false);
    }
  };

  const renameSeat = async (seatIndex: number) => {
    if (!order || !order.seats) return;
    const current = order.seats[seatIndex];
    const defaultName = current?.name ?? `Persona ${current?.seatNumber ?? seatIndex + 1}`;
    const name = prompt("Nombre de la persona:", defaultName);
    if (!name || name.trim() === "" || name === defaultName) return;
    const oid = getOrderId(order);
    if (!oid) {
      setOrder((prev) => {
        if (!prev) return prev;
        const seats = (prev.seats ?? []).map((s, i) => (i === seatIndex ? { ...s, name } : s));
        return { ...prev, seats };
      });
      return;
    }
    setSaving(true);
    try {
      const seats = order.seats.map((s, i) => (i === seatIndex ? { ...s, name } : s));
      const updated = await OrderService.updateOrder(oid, { seats });
      setOrder(updated ?? null);
    } catch (e) {
      console.error(e);
      alert("No se pudo renombrar la persona.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSeat = async (seatIndex: number) => {
    if (!order || !order.seats) return;
    if (!confirm("¿Eliminar esta persona? Sus platillos se moverán a otra persona si existe.")) return;
    const seats = order.seats;
    // If only one seat and it has items, prevent automatic deletion
    if (seats.length === 1) {
      if ((seats[0].items ?? []).length > 0) {
        alert("No se puede eliminar la única persona que tiene platillos. Mueve los platillos a otra persona primero.");
        return;
      }
      // Safe to remove empty single seat
      const oid = getOrderId(order);
      setSaving(true);
      try {
        if (!oid) {
          setOrder((prev) => (prev ? { ...prev, seats: [] } : prev));
          setActiveSeatIndex(0);
        } else {
          const updated = await OrderService.updateOrder(oid, { seats: [] });
          setOrder(updated ?? null);
          setActiveSeatIndex(0);
        }
      } catch (e) {
        console.error(e);
        alert("No se pudo eliminar la persona.");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Merge items into adjacent seat (prefer previous, otherwise next)
    const targetIdx = seatIndex > 0 ? seatIndex - 1 : 1;
    const newSeats = seats.slice();
    newSeats[targetIdx] = { ...newSeats[targetIdx], items: [...(newSeats[targetIdx].items ?? []), ...(newSeats[seatIndex].items ?? [])] };
    newSeats.splice(seatIndex, 1);

    const oid = getOrderId(order);
    setSaving(true);
    try {
      if (!oid) {
        setOrder((prev) => (prev ? { ...prev, seats: newSeats } : prev));
        setActiveSeatIndex(Math.min(targetIdx, newSeats.length - 1));
      } else {
        const updated = await OrderService.updateOrder(oid, { seats: newSeats });
        setOrder(updated ?? null);
        setActiveSeatIndex(Math.min(targetIdx, (updated?.seats?.length ?? 1) - 1));
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar la persona.");
    } finally {
      setSaving(false);
    }
  };

  // Persist a local draft order to the backend. Optionally set a status after create (e.g. "sent").
  const persistOrder = async (statusAfterCreate?: string) => {
    if (!order) return null;
    // If already persisted return it
    if (getOrderId(order)) return order;
    setSaving(true);
    try {
      const payload = order.seats && order.seats.length > 0
        ? { tableId, seats: order.seats }
        : { tableId, items: order.items ?? [] };
      const created = await OrderService.createOrder(payload);
      let result = created ?? null;
      if (statusAfterCreate && result) {
        const updated = await OrderService.updateOrder(getOrderId(result)!, { status: statusAfterCreate });
        result = updated ?? result;
      }
      setOrder(result ?? null);
      return result ?? null;
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar la comanda.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const sendToKDS = async () => {
    if (!order || (flatItems ?? []).length === 0) {
      alert("No hay platillos en la comanda para enviar.");
      return;
    }
    // If draft, persist and set status to sent; if persisted, just update status
    setSaving(true);
    try {
      if (!getOrderId(order)) {
        await persistOrder("sent");
        return;
      }
      const updated = await OrderService.updateOrder(getOrderId(order)!, { status: "sent" });
      setOrder(updated ?? null);
    } catch (e) {
      console.error(e);
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
      // If draft (not persisted) just navigate back/remove draft
      if (!getOrderId(order)) {
        setOrder(null);
        navigate(-1);
        return;
      }
      await OrderService.updateOrder(getOrderId(order)!, { status: "cancelled" });
      navigate(-1);
    } catch (e) {
      console.error(e);
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
      if (!getOrderId(order)) {
        await persistOrder("ready_for_billing");
        navigate("/caja");
        return;
      }
      const updated = await OrderService.updateOrder(getOrderId(order)!, { status: "ready_for_billing" });
      setOrder(updated ?? null);
      navigate("/caja");
    } catch (e) {
      console.error(e);
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

      <div className="min-h-screen flex flex-col px-4 py-5 md:px-5 md:py-7 xl:px-8 xl:py-10 pb-0 md:pb-0">

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
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6">

          {/* ── Left: comanda (carrito) ─────────────────────────────────────── */}
          <div className="flex min-w-0 flex-col w-full md:w-3/5 xl:w-[70%] h-[calc(100vh-20rem)] min-h-0">

            {orderLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            ) : (
              <>
                {/* Item list */}
                <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col flex-1 min-h-0">
                  <div className="bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    <h2 className="font-semibold text-gray-800 dark:text-white/90">
                      Comanda{" "}
                      {itemCount > 0 && (
                        <span className="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                          {itemCount} ítem{itemCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </h2>

                    {/* Seat selector */}
                    <div className="mt-2 flex items-center gap-2">
                      {(order?.seats ?? []).map((seat, i) => (
                        <button
                          key={seat.seatNumber}
                          type="button"
                          onClick={() => setActiveSeatIndex(i)}
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${i === activeSeatIndex ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                          {seat.name ?? `Persona ${seat.seatNumber}`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={addSeat}
                        disabled={saving}
                        className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 text-sm"
                        title="Agregar persona"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {!order || (flatItems ?? []).length === 0 ? (
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
                        {(order.seats && order.seats.length > 0) ? (
                          order.seats.map((seat, seatIdx) => (
                            <div key={seat.seatNumber} className="pb-2">
                              <div className="px-4 py-2 flex items-center justify-between bg-gray-50 dark:bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleSeatCollapse(seatIdx)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                                  >
                                    {seat.collapsed ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    )}
                                  </button>
                                  <button type="button" onClick={() => setActiveSeatIndex(seatIdx)} className="text-left">
                                    <div className="font-semibold text-gray-800 dark:text-white/90">{seat.name ?? `Persona ${seat.seatNumber}`}</div>
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm text-gray-500">{(seat.items ?? []).reduce((a, it) => a + (it.quantity || 1), 0)} ítem{(seat.items ?? []).reduce((a, it) => a + (it.quantity || 1), 0) !== 1 ? 's' : ''}</div>
                                  <button type="button" onClick={() => renameSeat(seatIdx)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" title="Renombrar">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 21v-3.75L14.06 6.19a2 2 0 012.82 0l1.94 1.94a2 2 0 010 2.82L7.75 21H3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                  <button type="button" onClick={() => deleteSeat(seatIdx)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50" title="Eliminar">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                </div>
                              </div>
                              {!seat.collapsed && (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                  {(seat.items ?? []).map((it) => {
                                  const statusInfo = ITEM_STATUS_MAP[it.status ?? "pending"] ?? ITEM_STATUS_MAP.pending;
                                  const lineTotal = (it.unitPrice ?? 0) * (it.quantity || 1);
                                  const editable = !isFinal && it.status !== "completed" && it.status !== "cancelled";
                                  return (
                                    <div key={itemKey(it)} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white/90 truncate">{it.name}</div>
                                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusInfo.cls}`}>
                                          {statusInfo.label}
                                        </span>
                                      </div>
                                      <div className="w-20 text-right text-xs text-gray-500 dark:text-gray-400">${(it.unitPrice ?? 0).toFixed(2)} c/u</div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          disabled={!editable || saving}
                                          onClick={() => changeQty(it, -1, seatIdx)}
                                          className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 dark:border-gray-700 dark:bg-white/[0.04] dark:text-white/70"
                                        >−</button>
                                        <span className="w-9 md:w-7 text-center text-sm font-semibold text-gray-800 dark:text-white/90">{it.quantity}</span>
                                        <button
                                          disabled={!editable || saving}
                                          onClick={() => changeQty(it, 1, seatIdx)}
                                          className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 dark:border-gray-700 dark:bg-white/[0.04] dark:text-white/70"
                                        >+</button>
                                      </div>
                                      <div className="w-20 text-right font-semibold text-gray-800 dark:text-white/80">${lineTotal.toFixed(2)}</div>
                                      <button
                                        disabled={!editable || saving}
                                        onClick={() => removeItem(it, seatIdx)}
                                        title="Quitar platillo"
                                        className="ml-1 flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-lg border border-transparent text-gray-400 hover:border-rose-300 hover:text-rose-600 disabled:opacity-30 dark:hover:text-rose-400"
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
                          ))
                        ) : (
                          (order.items ?? []).map((it) => {
                            const statusInfo = ITEM_STATUS_MAP[it.status ?? "pending"] ?? ITEM_STATUS_MAP.pending;
                            const lineTotal = (it.unitPrice ?? 0) * (it.quantity || 1);
                            const editable = !isFinal && it.status !== "completed" && it.status !== "cancelled";
                            return (
                              <div key={itemKey(it)} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 dark:text-white/90 truncate">{it.name}</div>
                                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusInfo.cls}`}>
                                    {statusInfo.label}
                                  </span>
                                </div>
                                <div className="w-20 text-right text-xs text-gray-500 dark:text-gray-400">${(it.unitPrice ?? 0).toFixed(2)} c/u</div>
                                <div className="flex items-center gap-2">
                                  <button
                                    disabled={!editable || saving}
                                    onClick={() => changeQty(it, -1)}
                                    className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 dark:border-gray-700 dark:bg-white/[0.04] dark:text-white/70"
                                  >−</button>
                                  <span className="w-9 md:w-7 text-center text-sm font-semibold text-gray-800 dark:text-white/90">{it.quantity}</span>
                                  <button
                                    disabled={!editable || saving}
                                    onClick={() => changeQty(it, 1)}
                                    className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 dark:border-gray-700 dark:bg-white/[0.04] dark:text-white/70"
                                  >+</button>
                                </div>
                                <div className="w-20 text-right font-semibold text-gray-800 dark:text-white/80">${lineTotal.toFixed(2)}</div>
                                <button
                                  disabled={!editable || saving}
                                  onClick={() => removeItem(it)}
                                  title="Quitar platillo"
                                  className="ml-1 flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-lg border border-transparent text-gray-400 hover:border-rose-300 hover:text-rose-600 disabled:opacity-30 dark:hover:text-rose-400"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  </svg>
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals + Actions container
                  - Located as footer inside the card so it stays visible
                  - Only the items list scrolls */}
                <div className="flex-none bg-white/95 md:bg-transparent border-t md:border-0 px-4 py-3 md:px-0 md:py-0">
                  <div className="max-w-full md:max-w-none">
                    <div className="mb-3 md:mb-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 md:px-5 md:py-4 dark:border-gray-800 dark:bg-white/[0.03]">
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>Subtotal ({itemCount} ítem{itemCount !== 1 ? "s" : ""})</span>
                        <span className="font-medium text-gray-800 dark:text-white/80">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                        <span className="text-base font-bold text-gray-800 dark:text-white">Total</span>
                        <span className="text-xl font-bold text-brand-600 dark:text-brand-400">${subtotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 md:items-center">
                      <Button
                        className="w-full md:w-auto"
                        disabled={saving || !order || (flatItems ?? []).length === 0 || isFinal}
                        onClick={sendToKDS}
                        startIcon={
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M22 12L12 2 2 12h3v8a1 1 0 001 1h5v-6h2v6h5a1 1 0 001-1v-8h3z" fill="currentColor"/>
                          </svg>
                        }
                      >
                        Enviar a KDS
                      </Button>

                      <Button
                        className="w-full md:w-auto"
                        disabled={saving || !order || (flatItems ?? []).length === 0 || isFinal}
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

                      <button
                        disabled={saving}
                        onClick={cancelOrder}
                        className="w-full md:w-auto inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-40 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-600/10"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                        Cancelar comanda
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Right sidebar: product catalogue ────────────────────────────── */}
          <aside className="flex w-full md:w-2/5 xl:w-[35%] flex-shrink-0 flex-col gap-3">

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
            <div className="max-h-[calc(100vh-18rem)] md:max-h-[calc(100vh-14rem)] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
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
                <div className="grid grid-cols-2 gap-2 md:divide-y md:grid-cols-1">
                  {filteredProducts.map((p) => {
                    const inCart = isInCart(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 bg-white px-3 py-2.5 transition-colors hover:bg-gray-50 dark:bg-transparent dark:hover:bg-white/[0.03] rounded-md"
                      >
                        {/* Thumb */}
                        <div className="h-12 w-12 md:h-10 md:w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
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
                        {/* Add button (bigger on mobile) */}
                        <button
                          disabled={saving}
                          onClick={() => addProduct(p)}
                          className={`flex h-9 w-9 md:h-7 md:w-7 flex-shrink-0 items-center justify-center rounded-lg text-lg font-bold transition-colors disabled:opacity-40 ${
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

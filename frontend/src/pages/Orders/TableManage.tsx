import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import ProductService from "../Admin/Products/Product.service";
import OrderService from "./Order.service";
import ProductCard from "../../components/ecommerce/ProductCard";
import { Product } from "../Admin/Products/Product.interface";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { Category, CATEGORY_LABELS } from "../../constants/categories";
import { useLocation, useNavigate, useParams } from "react-router";

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
  items: OrderItem[];
  status?: string;
};

export default function TableManage() {
  const navigate = useNavigate();
  const params = useParams();
  const searchParams = new URLSearchParams(useLocation().search);
  const tableId = params.tableId ?? searchParams.get("tableId") ?? undefined;

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());

  const [order, setOrder] = useState<Order | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setProductsLoading(true);
    ProductService.fetchProducts(400)
      .then((data) => {
        if (!mounted) return;
        setProducts(data ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setProducts([]);
      })
      .finally(() => {
        if (!mounted) return;
        setProductsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!tableId) return setOrdersLoading(false);
    let mounted = true;
    setOrdersLoading(true);
    OrderService.fetchOrders()
      .then((list) => {
        if (!mounted) return;
        // find active order for this table (prefer non-completed)
        const found = (list ?? []).find((o: any) => {
          const tid = o.tableId ? String(o.tableId) : o.tableId;
          return tid === tableId && o.status !== 'completed';
        }) || (list ?? []).find((o: any) => String(o.tableId) === tableId);
        setOrder(found ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setOrder(null);
      })
      .finally(() => {
        if (!mounted) return;
        setOrdersLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [tableId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => (p.categories ?? []).forEach((c) => set.add(c)));
    return Array.from(set).sort((a, b) => (CATEGORY_LABELS[a as Category] || a).localeCompare(CATEGORY_LABELS[b as Category] || b, 'es'));
  }, [products]);

  const toggleCategory = (c: string) => {
    setSelectedCats((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q);
      const matchesCategory = selectedCats.size === 0 || (p.categories ?? []).some((c) => selectedCats.has(c));
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCats]);

  const getOrderId = (o: any) => o?._id ?? o?.id ?? null;

  const addProductToOrder = async (product: Product) => {
    try {
      if (!tableId) return alert('No table selected');

      const newItem: OrderItem = {
        menuItemId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        status: 'pending',
      };

      if (!order) {
        // create order
        const created = await OrderService.createOrder({ tableId, items: [newItem] });
        setOrder(created ?? null);
        return;
      }

      const oid = getOrderId(order) as string;
      const updatedItems = [...(order.items ?? []), newItem];
      const updated = await OrderService.updateOrder(oid, { items: updatedItems });
      setOrder(updated ?? null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add product to order', err);
      alert('No se pudo agregar el platillo.');
    }
  };

  const updateItemQuantity = async (item: OrderItem, delta: number) => {
    if (!order) return;
    try {
      const oid = getOrderId(order) as string;
      const items = (order.items ?? []).map((it) => {
        if ((it._id ?? (it as any).id) === (item._id ?? (item as any).id) || (it.menuItemId === item.menuItemId && it.name === item.name && !it._id && !item._id)) {
          return { ...it, quantity: Math.max(1, (it.quantity || 1) + delta) };
        }
        return it;
      });
      const updated = await OrderService.updateOrder(oid, { items });
      setOrder(updated ?? null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update item qty', err);
      alert('No se pudo actualizar la cantidad.');
    }
  };

  const removeItem = async (item: OrderItem) => {
    if (!order) return;
    try {
      const oid = getOrderId(order) as string;
      const items = (order.items ?? []).filter((it) => (it._id ?? (it as any).id) !== (item._id ?? (item as any).id));
      const updated = await OrderService.updateOrder(oid, { items });
      setOrder(updated ?? null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove item', err);
      alert('No se pudo quitar el platillo.');
    }
  };

  return (
    <div>
      <PageMeta title="Gestionar mesa | mesaDigital" description="Gestión de comanda por mesa" />
      <PageBreadcrumb pageTitle={tableId ? `Mesa ${tableId}` : 'Gestión de mesa'} />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.06] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="mb-4 text-center">
            <h3 className="mb-1 font-semibold text-gray-800 dark:text-white/90">Gestión de mesa</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Aquí ves los platillos solicitados y puedes agregar más desde la carta.</p>
          </div>

          <div className="flex gap-6">
            {/* Order panel */}
            <div className="w-80 flex-shrink-0 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.04]">
              <div className="mb-3">
                <div className="text-sm text-gray-500">Mesa</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-white/90">{tableId ?? '-'}</div>
              </div>

              <div className="mb-3">
                <div className="text-sm text-gray-500">Comanda</div>
                {ordersLoading ? (
                  <div className="mt-2 text-sm text-gray-400">Cargando…</div>
                ) : !order ? (
                  <div className="mt-2 text-sm text-gray-400">No hay comanda. Crea una desde la carta.</div>
                ) : (
                  <div className="space-y-3">
                    {(order.items ?? []).map((it) => (
                      <div key={(it as any)._id ?? `${it.menuItemId}-${it.name}`} className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm text-gray-800 dark:text-white/90">{it.name}</div>
                          <div className="text-xs text-gray-500">${(it.unitPrice ?? 0).toFixed(2)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateItemQuantity(it, -1)} className="h-7 w-7 rounded border bg-white text-sm">-</button>
                          <div className="text-sm">{it.quantity}</div>
                          <button onClick={() => updateItemQuantity(it, 1)} className="h-7 w-7 rounded border bg-white text-sm">+</button>
                          <button onClick={() => removeItem(it)} className="ml-2 text-xs text-rose-600">Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <Button onClick={() => navigate('/menu')}>Abrir carta completa</Button>
              </div>
            </div>

            {/* Products grid */}
            <div className="flex-1">
              {productsLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-44 w-full rounded-2xl bg-gray-200 dark:bg-gray-700" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {filteredProducts.map((p) => (
                    <div key={p.id} className="relative">
                      <ProductCard product={p} />
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-sm text-gray-700 dark:text-white/80">${p.price.toFixed(2)}</div>
                        <Button onClick={() => addProductToOrder(p)} className="text-sm">Agregar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right sidebar: filters */}
            <aside className="w-64 flex-shrink-0 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.04]">
              <div className="mb-3">
                <label className="text-sm text-gray-500">Buscar platillo</label>
                <Input placeholder="Nombre o descripción" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-2">Categorías</div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCategory(c)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedCats.has(c) ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/80'}`}
                    >
                      {CATEGORY_LABELS[c as Category] ?? c}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

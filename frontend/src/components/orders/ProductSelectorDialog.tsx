import { useEffect, useMemo, useState } from "react";
import ProductService from "../../pages/Admin/Products/Product.service";
import { Product } from "../../pages/Admin/Products/Product.interface";
import { Modal } from "../ui/modal";
import { Category, CATEGORY_LABELS, CATEGORY_GROUPS } from "../../constants/categories";
import { Allergen, ALLERGEN_LABELS } from "../../constants/allergens";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (products: Product[]) => void;
}

// Allergen emoji for quick visual reference
const ALLERGEN_EMOJI: Record<Allergen, string> = {
  [Allergen.GLUTEN]:          "🌾",
  [Allergen.CRUSTACEOS]:      "🦐",
  [Allergen.HUEVO]:           "🥚",
  [Allergen.PESCADO]:         "🐟",
  [Allergen.CACAHUETE]:       "🥜",
  [Allergen.SOJA]:            "🫘",
  [Allergen.LACTEOS]:         "🥛",
  [Allergen.FRUTOS_CASCARA]:  "🌰",
  [Allergen.APIO]:            "🌿",
  [Allergen.MOSTAZA]:         "🌻",
  [Allergen.SESAMO]:          "⚪",
  [Allergen.SULFITOS]:        "🍇",
  [Allergen.ALTRAMUCES]:      "🌼",
  [Allergen.MOLUSCOS]:        "🦪",
};

function ProductCard({ product, selected, onToggle }: {
  product: Product;
  selected: boolean;
  onToggle: () => void;
}) {
  const cats = product.categories ?? [];
  const allergens = product.allergens ?? [];

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative flex flex-col rounded-2xl border text-left transition-all duration-150 cursor-pointer overflow-hidden
        ${selected
          ? "border-brand-500 ring-2 ring-brand-500/30 bg-brand-50/60 dark:bg-brand-500/10"
          : "border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.03] hover:border-brand-300 hover:shadow-md dark:hover:border-brand-600"
        }`}
    >
      {/* Imagen */}
      <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {product.coverImage ? (
          <img
            src={product.coverImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-3xl text-gray-300 dark:text-gray-600 select-none">🍽️</span>
          </div>
        )}
        {/* Overlay de selección */}
        {selected && (
          <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
        {/* Badge de no disponible */}
        {product.available === false && (
          <div className="absolute top-2 left-2">
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">No disponible</span>
          </div>
        )}
        {/* Precio flotante */}
        <div className="absolute bottom-2 right-2">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            ${(product.price ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-3">
        <div className="font-semibold text-sm text-gray-800 dark:text-white/90 leading-tight line-clamp-1">
          {product.name}
        </div>

        {/* Categorías */}
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cats.slice(0, 3).map((c) => (
              <span key={c} className="rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 px-2 py-0.5 text-[10px] font-medium">
                {CATEGORY_LABELS[c] ?? c}
              </span>
            ))}
            {cats.length > 3 && (
              <span className="rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 px-2 py-0.5 text-[10px]">
                +{cats.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Alérgenos */}
        {allergens.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {allergens.map((a) => (
              <span
                key={a}
                title={ALLERGEN_LABELS[a] ?? a}
                className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-400"
              >
                <span>{ALLERGEN_EMOJI[a] ?? "⚠️"}</span>
                <span className="hidden sm:inline">{ALLERGEN_LABELS[a] ?? a}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/[0.05] overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export default function ProductSelectorDialog({ isOpen, onClose, onConfirm }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<Category | "ALL">("ALL");
  const [activeAllergens, setActiveAllergens] = useState<Set<Allergen>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);
    setSelected({});
    setSearch("");
    setActiveCategory("ALL");
    setActiveAllergens(new Set());

    ProductService.fetchProducts(200)
      .then((list) => { if (mounted) setProducts(list ?? []); })
      .catch(() => { if (mounted) setProducts([]); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [isOpen]);

  // Categorías presentes en los productos cargados
  const presentCategories = useMemo(() => {
    const set = new Set<Category>();
    products.forEach((p) => (p.categories ?? []).forEach((c) => set.add(c)));
    return set;
  }, [products]);

  // Alérgenos presentes en los productos cargados
  const presentAllergens = useMemo(() => {
    const set = new Set<Allergen>();
    products.forEach((p) => (p.allergens ?? []).forEach((a) => set.add(a)));
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !(p.name ?? "").toLowerCase().includes(q) && !(p.sku ?? "").toLowerCase().includes(q)) return false;
      if (activeCategory !== "ALL" && !(p.categories ?? []).includes(activeCategory)) return false;
      if (activeAllergens.size > 0) {
        const pAllergens = new Set(p.allergens ?? []);
        for (const a of activeAllergens) {
          if (!pAllergens.has(a)) return false;
        }
      }
      return true;
    });
  }, [products, search, activeCategory, activeAllergens]);

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const toggleAllergen = (a: Allergen) =>
    setActiveAllergens((prev) => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleConfirm = () => {
    const chosen = products.filter((p) => selected[p.id]);
    if (chosen.length === 0) return;
    onConfirm(chosen);
  };

  // Grupos de categorías que tienen al menos un producto
  const activeGroups = useMemo(
    () => CATEGORY_GROUPS.filter((g) => g.items.some((c) => presentCategories.has(c))),
    [presentCategories],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="!w-[88vw] !h-[88vh] max-w-none !p-0 !rounded-2xl overflow-hidden">
      <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 dark:border-white/[0.07] shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Seleccionar platillos</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Elige uno o varios productos para agregar a la persona</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z" />
          </svg>
        </button>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar de categorías */}
        <aside className="hidden md:flex w-52 shrink-0 flex-col border-r border-gray-100 dark:border-white/[0.07] overflow-y-auto bg-gray-50/50 dark:bg-white/[0.01]">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors
              ${activeCategory === "ALL"
                ? "bg-brand-500 text-white"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
              }`}
          >
            <span>Todos</span>
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${activeCategory === "ALL" ? "bg-white/20" : "bg-gray-200 dark:bg-white/[0.08] text-gray-500"}`}>
              {products.length}
            </span>
          </button>

          {activeGroups.map((group) => (
            <div key={group.label}>
              <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {group.label}
              </div>
              {group.items
                .filter((c) => presentCategories.has(c))
                .map((c) => {
                  const count = products.filter((p) => (p.categories ?? []).includes(c)).length;
                  return (
                    <button
                      key={c}
                      onClick={() => setActiveCategory(c)}
                      className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors
                        ${activeCategory === c
                          ? "bg-brand-500 text-white"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                        }`}
                    >
                      <span>{CATEGORY_LABELS[c]}</span>
                      <span className={`text-xs rounded-full px-1.5 py-0.5 ${activeCategory === c ? "bg-white/20" : "bg-gray-200 dark:bg-white/[0.08] text-gray-500"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </aside>

        {/* Panel principal */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0">
          {/* Barra superior: búsqueda + filtro alérgenos */}
          <div className="shrink-0 px-4 pt-3 pb-2 space-y-2 border-b border-gray-100 dark:border-white/[0.07]">
            {/* Buscador */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-900 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            {/* Chips de alérgenos */}
            {presentAllergens.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="self-center text-xs text-gray-400 dark:text-gray-500 shrink-0">Filtrar alérgeno:</span>
                {presentAllergens.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleAllergen(a)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all
                      ${activeAllergens.has(a)
                        ? "border-amber-400 bg-amber-400 text-white dark:border-amber-500 dark:bg-amber-500"
                        : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                      }`}
                  >
                    <span>{ALLERGEN_EMOJI[a] ?? "⚠️"}</span>
                    <span>{ALLERGEN_LABELS[a]}</span>
                  </button>
                ))}
                {activeAllergens.size > 0 && (
                  <button
                    onClick={() => setActiveAllergens(new Set())}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700"
                  >
                    ✕ Limpiar
                  </button>
                )}
              </div>
            )}

            {/* Categoría activa en mobile */}
            <div className="flex md:hidden gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setActiveCategory("ALL")}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors
                  ${activeCategory === "ALL" ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-600 dark:border-white/[0.1] dark:text-gray-300"}`}
              >
                Todos
              </button>
              {Array.from(presentCategories).map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors
                    ${activeCategory === c ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-600 dark:border-white/[0.1] dark:text-gray-300"}`}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <span className="text-5xl">🍽️</span>
                <p className="text-sm">No se encontraron productos con esos filtros.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    selected={!!selected[p.id]}
                    onToggle={() => toggle(p.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between gap-4 border-t border-gray-100 dark:border-white/[0.07] px-4 py-3 bg-white dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedCount > 0 ? (
                <span className="font-medium text-brand-600 dark:text-brand-400">{selectedCount} seleccionado{selectedCount > 1 ? "s" : ""}</span>
              ) : (
                <span>Selecciona productos del menú</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedCount === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Agregar{selectedCount > 0 ? ` (${selectedCount})` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </Modal>
  );
}

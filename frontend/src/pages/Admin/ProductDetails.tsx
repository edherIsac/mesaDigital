import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import ProductService, {
  CreateProductDto,
  UpdateProductDto,
} from "./Product.service";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === undefined;
  const navigate = useNavigate();

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [menuOrder, setMenuOrder] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [calories, setCalories] = useState("");
  const [available, setAvailable] = useState(true);
  const [onKds, setOnKds] = useState(true);
  const [tags, setTags] = useState("");
  const [allergens, setAllergens] = useState("");

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    undefined,
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const imageObjectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isNew) {
      setFetchLoading(true);
      setError(null);
      ProductService.fetchProductById(id as string)
        .then((p) => {
          setName(p.name ?? "");
          setDescription(p.description ?? "");
          setPrice(p.price !== undefined ? String(p.price) : "");
          setSku(p.sku ?? "");
          setCategory(p.category ?? "");
          setMenuOrder(p.menuOrder !== undefined ? String(p.menuOrder) : "0");
          setPrepTime(p.prepTime !== undefined ? String(p.prepTime) : "0");
          setCalories(p.calories !== undefined ? String(p.calories) : "");
          setAvailable(p.available ?? true);
          setOnKds(p.onKds ?? true);
          setTags((p.tags ?? []).join(", "));
          setAllergens((p.allergens ?? []).join(", "));
          setImagePreview(p.coverImage ?? undefined);
          setCreatedAt(p.createdAt);
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg || "Error al cargar producto");
        })
        .finally(() => setFetchLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const applyImageFile = (f: File) => {
    if (!f.type.startsWith("image/")) return;
    if (imageObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(imageObjectUrlRef.current);
      } catch { /* ignore revoke errors */ }
    }
    const url = URL.createObjectURL(f);
    imageObjectUrlRef.current = url;
    setImageFile(f);
    setImagePreview(url);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) applyImageFile(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) applyImageFile(f);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const priceNum = parseFloat(price);
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      setError("El precio debe ser un número válido");
      return;
    }

    try {
      setLoading(true);

      let savedId = id as string | undefined;

      // When creating, create the product first to get an id, then upload image
      if (isNew) {
        const body: CreateProductDto = {
          name: name.trim(),
          price: priceNum,
          description: description.trim() || undefined,
          sku: sku.trim() || undefined,
          category: category.trim() || undefined,
          available,
          onKds,
          menuOrder: menuOrder !== "" ? parseInt(menuOrder, 10) : 0,
          prepTime: prepTime !== "" ? parseInt(prepTime, 10) : 0,
          calories: calories !== "" ? parseInt(calories, 10) : undefined,
          tags: tags
            ? tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          allergens: allergens
            ? allergens
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean)
            : [],
        };
        const created = await ProductService.createProduct(body);
        savedId = created?.id;
      } else {
        const body: UpdateProductDto = {
          name: name.trim(),
          price: priceNum,
          description: description.trim() || undefined,
          sku: sku.trim() || undefined,
          category: category.trim() || undefined,
          available,
          onKds,
          menuOrder: menuOrder !== "" ? parseInt(menuOrder, 10) : 0,
          prepTime: prepTime !== "" ? parseInt(prepTime, 10) : 0,
          calories: calories !== "" ? parseInt(calories, 10) : undefined,
          tags: tags
            ? tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          allergens: allergens
            ? allergens
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean)
            : [],
        };
        await ProductService.updateProduct(id as string, body);
      }

      // Upload image if one was selected (edit or just-created)
      if (imageFile && savedId) {
        try {
          setUploadingImage(true);
          await ProductService.uploadProductImage(savedId, imageFile);
        } catch (err) {
          console.warn("Image upload failed", err);
          setError(
            "No se pudo subir la imagen (el producto se guardó sin imagen).",
          );
        } finally {
          setUploadingImage(false);
        }
      }

      navigate("/admin/products");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("¿Eliminar este producto?")) return;
    try {
      setLoading(true);
      await ProductService.deleteProduct(id);
      navigate("/admin/products");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/admin/products")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05]"
          aria-label="Volver"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isNew ? "Nuevo producto" : "Editar producto"}
          </h1>
          {createdAt && (
            <p className="mt-0.5 text-xs text-gray-400">
              Creado: {new Date(createdAt).toLocaleDateString("es-MX")}
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} noValidate>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Cover image */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Imagen de portada
              </h2>

              {/* Image zone – drag/drop only in edit or new (always shown, upload on save) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer select-none overflow-hidden rounded-xl border-2 border-dashed transition-colors
                  ${isDragOver ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-gray-300 hover:border-brand-400 dark:border-gray-700 dark:hover:border-brand-500"}`}
                style={{ aspectRatio: "4/3" }}
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Portada"
                      className="h-full w-full object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-white"
                      >
                        <path
                          d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polyline
                          points="17 8 12 3 7 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <line
                          x1="12"
                          y1="3"
                          x2="12"
                          y2="15"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="text-xs font-medium text-white">
                        Cambiar imagen
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-white/[0.05]">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-gray-400"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="8.5"
                          cy="8.5"
                          r="1.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="m21 15-5-5L5 21"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Arrastra o haz clic
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        PNG, JPG, WebP — máx. 5 MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImageChange}
              />

              {imageFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageFile(null);
                    setImagePreview(undefined);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mt-3 w-full rounded-lg border border-red-200 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  Quitar imagen
                </button>
              )}

              {uploadingImage && (
                <div className="mt-3 flex items-center gap-2 text-xs text-brand-600 dark:text-brand-400">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                  Subiendo imagen…
                </div>
              )}
            </div>
          </div>

          {/* Right: Form fields */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Información general
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Name */}
                <div className="sm:col-span-2">
                  <Label>
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Nombre del producto"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <Label>Descripción</Label>
                  <textarea
                    rows={3}
                    placeholder="Descripción breve del producto"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                    className="w-full resize-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                  />
                </div>

                {/* Price */}
                <div>
                  <Label>
                    Precio <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* SKU */}
                <div>
                  <Label>SKU</Label>
                  <Input
                    placeholder="Código de referencia"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Category */}
                <div>
                  <Label>Categoría</Label>
                  <Input
                    placeholder="Ej. Bebidas, Entradas…"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Menu order */}
                <div>
                  <Label>Orden en menú</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={menuOrder}
                    onChange={(e) => setMenuOrder(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Nutrition & prep */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Cocina & nutrición
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Tiempo de preparación (seg)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label>Calorías</Label>
                  <Input
                    type="number"
                    placeholder="—"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label>Etiquetas (separadas por coma)</Label>
                  <Input
                    placeholder="picante, sin gluten…"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label>Alérgenos (separados por coma)</Label>
                  <Input
                    placeholder="gluten, mariscos…"
                    value={allergens}
                    onChange={(e) => setAllergens(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Estado
              </h2>
              <div className="space-y-3">
                {/* available */}
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-white/[0.02]">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Disponible en menú
                    </p>
                    <p className="text-xs text-gray-400">
                      {available
                        ? "Los clientes pueden pedirlo"
                        : "Oculto del menú"}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={available}
                    onClick={() => setAvailable((v) => !v)}
                    disabled={loading}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1
                      ${available ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform
                      ${available ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>

                {/* onKds */}
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-white/[0.02]">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enviar a pantalla de cocina (KDS)
                    </p>
                    <p className="text-xs text-gray-400">
                      {onKds
                        ? "Aparece en la pantalla de cocina"
                        : "No se muestra en KDS"}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={onKds}
                    onClick={() => setOnKds((v) => !v)}
                    disabled={loading}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1
                      ${onKds ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform
                      ${onKds ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              {!isNew && (
                <Button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="border border-red-200 bg-transparent text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  Eliminar producto
                </Button>
              )}
              <div className="flex gap-3 sm:ml-auto">
                <Button
                  type="button"
                  onClick={() => navigate("/admin/products")}
                  disabled={loading}
                  className="border border-gray-200 bg-transparent text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Guardando…
                    </span>
                  ) : isNew ? (
                    "Crear producto"
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

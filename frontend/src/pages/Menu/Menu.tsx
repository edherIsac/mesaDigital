import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState } from "react";
import ProductService from "../Admin/Products/Product.service";
import ProductCard from "../../components/ecommerce/ProductCard";
import { Product } from "../Admin/Products/Product.interface";

export default function Menu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    ProductService.fetchProducts()
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
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <PageMeta
        title="Menú | mesaDigital"
        description="Carta del restaurante — toma de órdenes"
      />
      <PageBreadcrumb pageTitle="Menú" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="text-center">
            <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
              Menú
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Selecciona un producto para ver detalles o agregarlo a la orden.
            </p>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-44 w-full rounded-2xl bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-3 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-2 h-3 w-11/12 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

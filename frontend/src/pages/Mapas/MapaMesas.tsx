import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState } from "react";
import MesaService from "../Admin/Mesas/Mesa.service";
import { Mesa } from "../Admin/Mesas/Mesa.interface";
import { useNavigate } from "react-router";

export default function MapaMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    MesaService.fetchMesas()
      .then((data) => {
        if (!mounted) return;
        setMesas(data ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setMesas([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  

  return (
    <div>
      <PageMeta title="Mapa de mesas | mesaDigital" description="Mapa de mesas" />
      <PageBreadcrumb pageTitle="Mapa de mesas" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.06] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="text-center">
            <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">Mapa de mesas</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona una mesa para ver su estado o gestionarla.</p>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-32 w-full rounded-2xl bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {mesas.map((m) => {
                  const disabled = !m.available || m.status === "OUT_OF_SERVICE";
                  const badge = m.available ? "Disponible" : (m.status === "OUT_OF_SERVICE" ? "Fuera de servicio" : "Ocupada");
                  const badgeClass = m.available
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-600 dark:text-white"
                    : (m.status === "OUT_OF_SERVICE"
                      ? "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-white"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-600 dark:text-white");

                  return (
                    <div
                      key={m.id}
                      role="button"
                      tabIndex={0}
                      aria-disabled={disabled}
                      onClick={() => { if (!disabled) navigate(`/orders/table/${m.id}`); }}
                      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !disabled) navigate(`/orders/table/${m.id}`); }}
                      className={`rounded-2xl border p-4 text-center transition-shadow focus:outline-none ${disabled ? "cursor-not-allowed opacity-80 border-gray-200 bg-gray-50 dark:bg-gray-800/60" : "cursor-pointer hover:shadow-lg border-gray-200 bg-white dark:bg-white/[0.06] dark:border-gray-800"}`}
                    >
                      <div className="flex items-center justify-center">
                        <div className="text-xl font-semibold text-gray-800 dark:text-white/90">{m.label}</div>
                      </div>
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Asientos: {m.seats ?? "-"}</div>
                      <div className="mt-1 text-sm text-gray-400">Zona: {m.zone ?? "-"}</div>
                      <div className="mt-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                          {badge}
                        </span>
                      </div>
                      
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

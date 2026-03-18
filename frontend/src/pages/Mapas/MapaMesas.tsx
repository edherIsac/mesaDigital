import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { useEffect, useState } from "react";
import MesaService from "../Admin/Mesas/Mesa.service";
import { Mesa } from "../Admin/Mesas/Mesa.interface";
import { useNavigate } from "react-router";

export default function MapaMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const mesaStatusLabel = (s?: string) => {
    const st = (s || 'available').toLowerCase();
    if (st === 'occupied') return 'Ocupada';
    if (st === 'available') return 'Disponible';
    return st.charAt(0).toUpperCase() + st.slice(1);
  };

  const statusBadgeClass = (s?: string) => {
    const st = (s || 'available').toLowerCase();
    if (st === 'occupied') return 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300';
    return 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-white/[0.03] dark:text-gray-300';
  };

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
    return () => {
      mounted = false;
    };
  }, []);

  // Navegar a la pantalla de inicio de comanda
  const goToStartOrder = (m: Mesa) => {
    navigate(`/orders/start/${m.id}`, { state: { mesa: m } });
  };

  return (
    <div>
      <PageMeta
        title="Mapa de mesas | mesaDigital"
        description="Mapa de mesas"
      />
      <PageBreadcrumb pageTitle="Mapa de mesas" />

      <div className="mx-auto w-full max-w-[1100px]">
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 w-full rounded-2xl bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-2 h-3 w-11/12 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {mesas.map((m) => (
                <ComponentCard
                  key={m.id}
                  title={m.label}
                  desc={`Asientos: ${m.seats ?? "-"} · ${mesaStatusLabel(m.status)}`}
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${m.status === 'occupied' ? 'ring-1 ring-yellow-400/20' : ''}`}
                  onClick={() => goToStartOrder(m)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Zona: {m.zone ?? "-"}</div>
                    <div className="ml-2">
                      <span className={statusBadgeClass(m.status)}>{mesaStatusLabel(m.status)}</span>
                    </div>
                  </div>
                </ComponentCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

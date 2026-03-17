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
                  desc={`Asientos: ${m.seats ?? "-"}`}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => goToStartOrder(m)}
                >
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Zona: {m.zone ?? "-"}
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

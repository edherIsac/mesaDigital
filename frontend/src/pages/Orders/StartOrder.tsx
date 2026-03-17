import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import MesaService from "../Admin/Mesas/Mesa.service";
import { Mesa } from "../Admin/Mesas/Mesa.interface";
import OrderService from "./Order.service";

export default function StartOrder() {
  const { tableId } = useParams() as { tableId?: string };
  const location = useLocation();
  const navigate = useNavigate();

  const initialMesa = (location.state as any)?.mesa as Mesa | undefined;

  const [mesa, setMesa] = useState<Mesa | null>(initialMesa ?? null);
  const [loading, setLoading] = useState(!initialMesa && !!tableId);
  const [creating, setCreating] = useState(false);

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

  const handleStart = async () => {
    if (!mesa) return;
    try {
      const raw = localStorage.getItem("user");
      const role = raw ? (JSON.parse(raw)?.role ?? null) : null;
      if (role !== "WAITER" && role !== "ADMIN") {
        alert("Acceso denegado");
        return;
      }
      if (!confirm(`Iniciar comanda en ${mesa.label}?`)) return;
      setCreating(true);
      await OrderService.createOrder({ tableId: mesa.id, items: [] });
      navigate(`/`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to create order", err);
      alert("No se pudo iniciar la comanda.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageMeta title="Iniciar comanda" description="Iniciar comanda para una mesa" />
      <PageBreadcrumb pageTitle="Iniciar comanda" />

      <div className="mx-auto w-full max-w-[900px]">
        <div className="mt-6">
          <ComponentCard title={mesa?.label ?? "Mesa"} desc={mesa ? `Asientos: ${mesa.seats ?? "-"}` : ""}>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Zona: {mesa?.zone ?? "-"}</div>
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-brand-50 text-brand-500 px-3 py-1 text-xs font-medium dark:bg-brand-500/15 dark:text-brand-300">
                      Estado: Disponible
                    </span>
                  </div>
                </div>

                <div>
                  <button
                    onClick={handleStart}
                    disabled={!mesa || creating}
                    className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {creating ? "Iniciando..." : "Iniciar comanda"}
                  </button>
                </div>
              </div>
            )}
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}

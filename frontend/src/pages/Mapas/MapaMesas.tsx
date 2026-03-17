import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState } from "react";
import MesaService from "../Admin/Mesas/Mesa.service";
import { Mesa } from "../Admin/Mesas/Mesa.interface";
import OrderService from "../Orders/Order.service";
import { useNavigate } from "react-router";

export default function MapaMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
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

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
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
                    <div className="mt-3 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-2 h-3 w-11/12 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {mesas.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 text-center hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={async () => {
                      try {
                        const raw = localStorage.getItem('user');
                        const role = raw ? (JSON.parse(raw)?.role ?? null) : null;
                        if (role !== 'WAITER' && role !== 'ADMIN') return;
                        if (!confirm(`Iniciar comanda en ${m.label}?`)) return;
                        setStarting(m.id);
                        const created = await OrderService.createOrder({ tableId: m.id, items: [] });
                        const orderId = created?._id ?? created?.id ?? created?.orderNumber ?? null;
                        // 'Menu' page removed — navigate to home after creating the order
                        navigate(`/`);
                      } catch (err) {
                        // eslint-disable-next-line no-console
                        console.error('Failed to create order', err);
                        alert('No se pudo iniciar la comanda.');
                      } finally {
                        setStarting(null);
                      }
                    }}
                  >
                    <div className="text-xl font-semibold text-gray-800">{m.label}</div>
                    <div className="mt-2 text-sm text-gray-500">Asientos: {m.seats ?? "-"}</div>
                    <div className="mt-1 text-sm text-gray-400">Zona: {m.zone ?? "-"}</div>
                    {starting === m.id && <div className="mt-2 text-xs text-gray-500">Iniciando comanda…</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

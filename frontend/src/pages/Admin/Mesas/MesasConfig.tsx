import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import MesaService from "./Mesa.service";
import { Mesa } from "./Mesa.interface";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";

export default function MesasConfig() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await MesaService.fetchMesas();
      setMesas(data ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Error al obtener mesas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  // Creation moved to a dedicated page

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar mesa?")) return;
    try {
      setLoading(true);
      await MesaService.deleteMesa(id);
      setMesas((s) => s.filter((m) => m.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Error al eliminar");
    } finally { setLoading(false); }
  };

  function SkeletonRow() {
    return (
      <tr className="border-t border-gray-100 dark:border-gray-800">
        {[...Array(4)].map((_, i) => (
          <td key={i} className="px-4 py-3">
            <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mesas</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">Configura y administra las mesas</p>
        </div>
          <Button onClick={() => navigate("/admin/mesa/new")} className="shrink-0" disabled={loading}>
            {loading ? "Cargando..." : "+ Nueva mesa"}
          </Button>
      </div>
        {/* Error (fetch/create errors shown here) */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

      {/* Listado */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-4">
          <h3 className="font-medium mb-3 text-gray-700 dark:text-gray-200">Mesas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-white/[0.03] dark:text-gray-300">
                <th className="px-4 py-3">Etiqueta</th>
                <th className="px-4 py-3">Asientos</th>
                <th className="px-4 py-3">Zona</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(5)].map((_, i) => <SkeletonRow key={i} />)}

              {!loading && mesas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400 dark:text-gray-300">
                    <div className="flex flex-col items-center gap-2">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="opacity-40">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span>No hay mesas.</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && mesas.length > 0 && mesas.map((m) => (
                <tr key={m.id} className="border-t border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.label}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.seats ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.zone ?? "-"}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleDelete(m.id)} className="text-sm text-red-500">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && (
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-400">
            {mesas.length} mesa{mesas.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

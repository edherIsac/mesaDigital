import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import MesaService from "./Mesa.service";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";

export default function MesaNew() {
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState<number | undefined>(undefined);
  const [zone, setZone] = useState("");
  // `status` is managed by the system; do not expose it in this form.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    MesaService.fetchMesas()
      .then((list) => {
        if (!mounted) return;
        const nums = list
          .map((m) => {
            if (!m || !m.label) return NaN;
            const match = String(m.label).match(/^M\s*(\d+)$/i);
            return match ? parseInt(match[1], 10) : NaN;
          })
          .filter((n) => Number.isFinite(n) && !isNaN(n));
        const max = nums.length ? Math.max(...nums) : 0;
        setLabel((prev) => prev || `M${max + 1}`);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!label) { setError("El nombre es obligatorio"); return; }
    try {
      setLoading(true);
      // do not send `status` from the UI; backend will apply the system default
      const created = await MesaService.createMesa({ label, seats, zone });
      if (created) {
        navigate("/admin/mesas");
      } else {
        setError("No se pudo crear la mesa");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Error al crear mesa");
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-screen-md px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/admin/mesas")}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nueva mesa</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">Registra una nueva mesa</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.06]">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Crear mesa</h3>
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input id="mesa-label" placeholder="Etiqueta (ej. M1)" value={label} onChange={(e) => setLabel(e.target.value)} readOnly />
          <Input placeholder="Asientos" type="number" value={seats ?? ""} onChange={(e) => setSeats(e.target.value ? Number(e.target.value) : undefined)} />
          <Input placeholder="Zona" value={zone} onChange={(e) => setZone(e.target.value)} />
          {/* Estado: gestionado por el sistema (no editable por el usuario) */}

          <div className="sm:col-span-3 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/mesas")} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear mesa"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

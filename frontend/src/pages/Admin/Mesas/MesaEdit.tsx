import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import MesaService from "./Mesa.service";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import { Mesa } from "./Mesa.interface";

export default function MesaEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState<number | undefined>(undefined);
  const [zone, setZone] = useState("");
  // `status` is system-managed (read-only in the UI)
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setFetchLoading(true);
    MesaService.fetchMesaById(id)
      .then((m) => {
        setMesa(m);
        setLabel(m.label ?? "");
        setSeats(m.seats);
        setZone(m.zone ?? "");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Error al cargar mesa");
      })
      .finally(() => setFetchLoading(false));
  }, [id]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!label) { setError("El nombre es obligatorio"); return; }
    try {
      setLoading(true);
      // do not send `status` from the UI; status is controlled by the system
      await MesaService.updateMesa(id as string, { label, seats, zone });
      navigate("/admin/mesas");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Error al guardar mesa");
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("¿Eliminar mesa?")) return;
    try {
      setLoading(true);
      await MesaService.deleteMesa(id);
      navigate("/admin/mesas");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Error al eliminar mesa");
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{mesa ? `Editar mesa` : "Editar mesa"}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">Actualiza los datos de la mesa</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.06]">
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input id="mesa-label" placeholder="Etiqueta (ej. M1)" value={label} onChange={(e) => setLabel(e.target.value)} readOnly />
          <Input placeholder="Asientos" type="number" value={seats ?? ""} onChange={(e) => setSeats(e.target.value ? Number(e.target.value) : undefined)} />
          <Input placeholder="Zona" value={zone} onChange={(e) => setZone(e.target.value)} />

          {/* Estado: oculto en la vista de edición según requerimiento */}

          <div className="sm:col-span-3 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button type="button" variant="outline" onClick={handleDelete} disabled={loading} className="text-sm text-red-500">
              Eliminar
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/admin/mesas")} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

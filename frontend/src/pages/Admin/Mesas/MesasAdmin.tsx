import { useEffect, useState } from "react";
import MesaService from "./Mesa.service";
import { Mesa } from "./Mesa.interface";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";

export default function MesasAdmin() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState<number | undefined>(undefined);
  const [zone, setZone] = useState("");

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

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!label) { setError("El nombre es obligatorio"); return; }
    try {
      setLoading(true);
      const created = await MesaService.createMesa({ label, seats, zone });
      if (created) setMesas((s) => [created, ...s]);
      setLabel(""); setSeats(undefined); setZone("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Error al crear mesa");
    } finally { setLoading(false); }
  };

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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Administración de mesas</h2>

      <section className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="font-medium mb-3">Crear mesa</h3>
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input placeholder="Etiqueta (ej. M1)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input placeholder="Asientos" type="number" value={seats ?? ""} onChange={(e) => setSeats(e.target.value ? Number(e.target.value) : undefined)} />
          <Input placeholder="Zona" value={zone} onChange={(e) => setZone(e.target.value)} />
          <div className="sm:col-span-3">
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creando..." : "Crear mesa"}</Button>
          </div>
        </form>
      </section>

      <section className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="font-medium mb-3">Mesas</h3>
        {loading && <p>Cargando...</p>}
        {!loading && mesas.length === 0 && <p>No hay mesas.</p>}
        {!loading && mesas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-600">
                  <th className="px-3 py-2">Etiqueta</th>
                  <th className="px-3 py-2">Asientos</th>
                  <th className="px-3 py-2">Zona</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mesas.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-3 py-2">{m.label}</td>
                    <td className="px-3 py-2">{m.seats ?? "-"}</td>
                    <td className="px-3 py-2">{m.zone ?? "-"}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => handleDelete(m.id)} className="text-sm text-red-500">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

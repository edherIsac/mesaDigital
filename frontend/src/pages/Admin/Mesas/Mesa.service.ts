import api from "../../../api/client";
import { Mesa } from "./Mesa.interface";

export async function fetchMesas(): Promise<Mesa[]> {
  const res = await api.get<Mesa[]>("/tables");
  const raw = res.data ?? [];
  // ensure id field
  return raw.map((r: any) => ({ ...r, id: r.id ?? r._id }));
}

export async function createMesa(body: { label: string; seats?: number; zone?: string }): Promise<Mesa> {
  const res = await api.post<Mesa>("/tables", body);
  const r = res.data as any;
  return { ...r, id: r.id ?? r._id };
}

export async function deleteMesa(id: string): Promise<boolean> {
  await api.delete(`/tables/${id}`);
  return true;
}

const MesaService = { fetchMesas, createMesa, deleteMesa };
export default MesaService;

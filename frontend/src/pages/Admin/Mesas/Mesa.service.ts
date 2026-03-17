import api from "../../../api/client";
import { Mesa } from "./Mesa.interface";

export async function fetchMesas(): Promise<Mesa[]> {
  const res = await api.get("/tables");
  const raw = res.data ?? [];
  // normalize each row into Mesa
  return (raw as Array<Record<string, unknown>>).map((r) => {
    const label = typeof r["label"] === "string" ? (r["label"] as string) : "";
    const seats = typeof r["seats"] === "number" ? (r["seats"] as number) : undefined;
    const zone = typeof r["zone"] === "string" ? (r["zone"] as string) : undefined;
    const createdAt = typeof r["createdAt"] === "string" ? (r["createdAt"] as string) : undefined;
    const id = typeof r["id"] === "string" ? (r["id"] as string) : typeof r["_id"] === "string" ? (r["_id"] as string) : String(r["id"] ?? r["_id"] ?? "");
    return { id, label, seats, zone, createdAt } as Mesa;
  });
}

export async function createMesa(body: { label: string; seats?: number; zone?: string }): Promise<Mesa> {
  const res = await api.post("/tables", body);
  const p = res.data as Record<string, unknown>;
  const id = typeof p["id"] === "string" ? (p["id"] as string) : typeof p["_id"] === "string" ? (p["_id"] as string) : String(p["id"] ?? p["_id"] ?? "");
  const label = typeof p["label"] === "string" ? (p["label"] as string) : "";
  const seats = typeof p["seats"] === "number" ? (p["seats"] as number) : undefined;
  const zone = typeof p["zone"] === "string" ? (p["zone"] as string) : undefined;
  const createdAt = typeof p["createdAt"] === "string" ? (p["createdAt"] as string) : undefined;
  return { id, label, seats, zone, createdAt } as Mesa;
}

export async function deleteMesa(id: string): Promise<boolean> {
  await api.delete(`/tables/${id}`);
  return true;
}

const MesaService = { fetchMesas, createMesa, deleteMesa };
export default MesaService;

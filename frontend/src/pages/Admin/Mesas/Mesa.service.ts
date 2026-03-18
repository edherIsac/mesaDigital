import api from "../../../api/client";
import { Mesa } from "./Mesa.interface";

function normalizeStatus(s?: string | undefined): string | undefined {
  if (!s) return undefined;
  const st = s.trim().toLowerCase();
  if (st === 'active') return 'available';
  if (st === 'disponible' || st === 'available') return 'available';
  if (st === 'ocupada' || st === 'ocupado' || st === 'occupied') return 'occupied';
  if (st === 'reservada' || st === 'reserved') return 'reserved';
  if (st === 'blocked' || st === 'bloqueada' || st === 'bloqueado') return 'blocked';
  return st;
}

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
    const currentOrderId = r["currentOrderId"] ? String((r["currentOrderId"] as any)) : undefined;
    const rawStatus = typeof r["status"] === "string" ? (r["status"] as string) : undefined;
    const status = normalizeStatus(rawStatus) ?? rawStatus;
    return { id, label, seats, zone, createdAt, currentOrderId, status } as Mesa;
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
  const currentOrderId = p["currentOrderId"] ? String((p["currentOrderId"] as any)) : undefined;
  const rawStatus = typeof p["status"] === "string" ? (p["status"] as string) : undefined;
  const status = normalizeStatus(rawStatus) ?? rawStatus;
  return { id, label, seats, zone, createdAt, currentOrderId, status } as Mesa;
}

export async function fetchMesaById(id: string): Promise<Mesa> {
  const res = await api.get(`/tables/${id}`);
  const p = res.data as Record<string, unknown>;
  const pid = typeof p["id"] === "string" ? (p["id"] as string) : typeof p["_id"] === "string" ? (p["_id"] as string) : String(p["id"] ?? p["_id"] ?? "");
  const label = typeof p["label"] === "string" ? (p["label"] as string) : "";
  const seats = typeof p["seats"] === "number" ? (p["seats"] as number) : undefined;
  const zone = typeof p["zone"] === "string" ? (p["zone"] as string) : undefined;
  const createdAt = typeof p["createdAt"] === "string" ? (p["createdAt"] as string) : undefined;
  const currentOrderId = p["currentOrderId"] ? String((p["currentOrderId"] as any)) : undefined;
  const rawStatus = typeof p["status"] === "string" ? (p["status"] as string) : undefined;
  const status = normalizeStatus(rawStatus) ?? rawStatus;
  return { id: pid, label, seats, zone, createdAt, currentOrderId, status } as Mesa;
}

export async function deleteMesa(id: string): Promise<boolean> {
  await api.delete(`/tables/${id}`);
  return true;
}

const MesaService = { fetchMesas, createMesa, deleteMesa, fetchMesaById };
export default MesaService;

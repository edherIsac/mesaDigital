// Tipos y helpers para usuarios (respuesta del backend)

export type Role =
  | "ADMIN"
  | "SUPERVISOR"
  | "WAITER"
  | "KITCHEN"
  | "CASHIER"
  | string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  active?: boolean;
  createdAt?: string;
}

// Forma cruda que puede venir desde el backend (a veces `id`, a veces `_id`)
export interface RawUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: Role | string;
  avatarUrl?: string;
  active?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

// Si tu API devuelve un envoltorio estándar, lo tipamos genérico aquí
export interface ApiResponse<T = unknown> {
  data: T;
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

// Normaliza RawUser -> User (centraliza la lógica de fallback)
export function normalizeUser(u: RawUser): User {
  return {
    id: u.id ?? u._id ?? "",
    name: u.name ?? "",
    email: u.email ?? "",
    role: (u.role as Role) ?? "",
    active: u.active ?? true,
    createdAt: u.createdAt,
    avatarUrl: (u.avatarUrl as string) ?? undefined,
  };
}

export default {} as unknown;

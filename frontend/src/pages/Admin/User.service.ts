import api from "../../api/client";
import { RawUser, User, ApiResponse, normalizeUser } from "./User.interface";

// Devuelve una lista normalizada usando la respuesta directa (res.data -> RawUser[])
export async function fetchUsers(): Promise<User[]> {
  const res = await api.get<RawUser[]>("/admin/users");
  const raw: RawUser[] = res.data ?? [];
  return raw.map(normalizeUser);
}

// Si tu backend devuelve un envoltorio { data: RawUser[] }
export async function fetchUsersWrapped(): Promise<User[]> {
  const res = await api.get<ApiResponse<RawUser[]>>("/admin/users");
  const raw: RawUser[] = res.data?.data ?? [];
  return raw.map(normalizeUser);
}

// Obtener un usuario por id
export async function fetchUserById(id: string): Promise<User> {
  const res = await api.get<RawUser | ApiResponse<RawUser>>(`/admin/users/${id}`);
  // Manejar ambos formatos: res.data puede ser RawUser o { data: RawUser }
  const payload = res.data as RawUser | ApiResponse<RawUser> | undefined;
  let raw: RawUser | undefined;
  if (payload && typeof payload === "object" && "data" in payload) {
    raw = (payload as ApiResponse<RawUser>).data;
  } else {
    raw = payload as RawUser | undefined;
  }
  return normalizeUser(raw ?? {});
}

export interface CreateUserDto {
  name: string;
  email: string;
  role?: User["role"] | string;
  password?: string;
  active?: boolean;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: User["role"] | string;
  password?: string;
  active?: boolean;
  avatarUrl?: string;
}

export async function createUser(body: CreateUserDto): Promise<User | null> {
  const res = await api.post<RawUser | ApiResponse<RawUser>>(`/admin/users`, body);
  const payload = res.data as RawUser | ApiResponse<RawUser> | undefined;
  const raw = payload && typeof payload === "object" && "data" in payload ? (payload as ApiResponse<RawUser>).data : (payload as RawUser | undefined);
  return raw ? normalizeUser(raw) : null;
}

export async function updateUser(id: string, body: UpdateUserDto): Promise<User | null> {
  const res = await api.patch<RawUser | ApiResponse<RawUser>>(`/admin/users/${id}`, body);
  const payload = res.data as RawUser | ApiResponse<RawUser> | undefined;
  const raw = payload && typeof payload === "object" && "data" in payload ? (payload as ApiResponse<RawUser>).data : (payload as RawUser | undefined);
  return raw ? normalizeUser(raw) : null;
}

export async function uploadUserAvatar(id: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append("avatar", file);
  const res = await api.post(`/admin/users/${id}/avatar`, fd, {
    headers: {
      // Let axios set the correct multipart boundary
      "Content-Type": "multipart/form-data",
    },
  });
  // Try to resolve common response shapes
  const payload: any = res.data;
  return payload?.url ?? payload?.data?.url ?? payload?.avatarUrl ?? "";
}

export async function deleteUser(id: string): Promise<boolean> {
  await api.delete(`/admin/users/${id}`);
  return true;
}

export const UserService = {
  fetchUsers,
  fetchUsersWrapped,
  fetchUserById,
  createUser,
  updateUser,
  uploadUserAvatar,
  deleteUser,
};

export default UserService;
// Ejemplos de uso (comentados):

// fetchUsers().then(setUsers).catch(setError)


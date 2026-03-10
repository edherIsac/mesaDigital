import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import api from "../../api/client";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SUPERVISOR" | "WAITER" | "KITCHEN" | string;
  createdAt?: string;
};

const ROLE_STYLES: Record<string, string> = {
  SUPERVISOR:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  ADMIN:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  WAITER:
    "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  KITCHEN:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_STYLES[role] ?? "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {role}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold dark:bg-brand-500/20 dark:text-brand-400">
      {initials}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-800 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/users");
      const data = res?.data;
      setUsers(data || []);
    } catch (err: any) {
      setError(err?.message ?? "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchQ = q
        ? (u.name || "").toLowerCase().includes(q.toLowerCase()) ||
          (u.email || "").toLowerCase().includes(q.toLowerCase())
        : true;
      const matchRole = roleFilter === "ALL" ? true : u.role === roleFilter;
      return matchQ && matchRole;
    });
  }, [users, q, roleFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Usuarios
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Cargando..." : `${filtered.length} de ${users.length} usuarios`}
          </p>
        </div>
        <Button onClick={() => navigate("/admin/user/new")} size="sm">
          + Nuevo usuario
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Buscar</Label>
            <Input
              placeholder="Nombre o correo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <Label>Rol</Label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            >
              <option value="ALL">Todos los roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPERVISOR">SUPERVISOR</option>
              <option value="WAITER">WAITER</option>
              <option value="KITCHEN">KITCHEN</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Usuario</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Correo</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Rol</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Creado</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                [1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="opacity-40">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span>No se encontraron usuarios</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] cursor-pointer"
                    onClick={() => navigate(`/admin/user/details/${u.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name || "?"} />
                        <span className="font-medium text-gray-800 dark:text-white/90">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import UserService from "./User.service";
import { User } from "./User.interface";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Label from "../../../components/form/Label";

// Using `User` from User.interface.ts

const ROLE_STYLES: Record<string, string> = {
  SUPERVISOR:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  WAITER:
    "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  KITCHEN:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  CASHIER: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400",
};

function RoleBadge({ role }: { role: string }) {
  const cls =
    ROLE_STYLES[role] ??
    "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {role}
    </span>
  );
}

function Avatar({ name, src }: { name: string; src?: string | null }) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src ?? undefined);

  useEffect(() => {
    setImgSrc(src ?? undefined);
  }, [src]);

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (imgSrc) {
    return (
      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden border border-gray-200 dark:border-gray-800">
        <img
          src={imgSrc}
          alt={name || "avatar"}
          className="object-cover h-full w-full"
          onError={() => setImgSrc(undefined)}
        />
      </div>
    );
  }

  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold dark:bg-brand-500/20 dark:text-brand-400">
      {initials || "?"}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-800 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 rounded bg-gray-200 dark:bg-gray-700"
            style={{ width: `${60 + i * 10}%` }}
          />
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
      const normalized = await UserService.fetchUsers();
      setUsers(normalized);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar usuarios";
      setError(errorMessage);
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

  // Debug: print filtered users when it changes
  // eslint-disable-next-line no-console
  useEffect(() => {
  }, [filtered]);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
            {loading ? "Cargando..." : `${filtered.length} de ${users.length} usuarios`}
          </p>
        </div>
        <Button onClick={() => navigate("/admin/user/new")} className="shrink-0">+ Nuevo usuario</Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:flex-row">
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Buscar</Label>
              <Input placeholder="Nombre o correo..." value={q} onChange={(e) => setQ(e.target.value)} />
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
                <option value="CASHIER">CASHIER</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-white/[0.03] dark:text-gray-300">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3">Activo</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400 dark:text-gray-300">
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

              {!loading && filtered.map((u) => (
                <tr
                  key={u.id ?? (u as unknown as Record<string, string>)._id}
                  onClick={() => navigate(`/admin/user/details/${u.id ?? (u as unknown as Record<string, string>)._id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/admin/user/details/${u.id ?? (u as unknown as Record<string, string>)._id}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="border-t border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name || "?"} src={u.avatarUrl} />
                      <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-300">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const prev = users;
                        setUsers((s) => s.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
                        try {
                          await UserService.updateUser(u.id, { active: !u.active });
                        } catch {
                          setUsers(prev);
                        }
                      }}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${u.active ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'}`}
                    >
                      {u.active ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footer count */}
        {!loading && (
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-400">
            {filtered.length} usuario{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== users.length && ` de ${users.length} total`}
          </div>
        )}
      </div>
    </div>
  );
}

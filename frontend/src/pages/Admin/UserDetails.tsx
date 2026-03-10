import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "../../icons";

const ROLE_STYLES: Record<string, string> = {
  SUPER: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  STUDIO: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
};

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xl font-bold dark:bg-brand-500/20 dark:text-brand-400">
      {initials || "?"}
    </span>
  );
}

export default function UserDetails() {
  const { id } = useParams();
  const isNew = id === undefined;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("STUDIO");
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:3100";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!isNew) {
      const fetchUser = async () => {
        setFetchLoading(true);
        setError(null);
        try {
          const res = await fetch(`${base}/api/admin/users/${id}`, {
            headers: { Authorization: token ? `Bearer ${token}` : "" },
          });
          if (!res.ok) throw new Error(`Error ${res.status}`);
          const data = await res.json();
          setName(data.name ?? "");
          setEmail(data.email ?? "");
          setRole(data.role ?? "STUDIO");
          setCreatedAt(data.createdAt);
        } catch (err: any) {
          setError(err?.message ?? "Error al cargar usuario");
        } finally {
          setFetchLoading(false);
        }
      };
      fetchUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!name || !email || (!password && isNew)) {
      setError("Nombre, correo y contraseña son obligatorios");
      return;
    }

    try {
      setLoading(true);
      const body: Record<string, string> = { name, email, role };
      if (password) body.password = password;

      const url = isNew ? `${base}/api/admin/users` : `${base}/api/admin/users/${id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.message ?? b?.error ?? `Error ${res.status}`);
      }

      navigate("/admin/users");
    } catch (err: any) {
      setError(err?.message ?? "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {isNew ? "Nuevo usuario" : "Editar usuario"}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {isNew ? "Completa el formulario para crear un usuario" : "Actualiza los datos del usuario"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/users")}>
          ← Volver a la lista
        </Button>
      </div>

      {fetchLoading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          Cargando datos...
        </div>
      )}

      {!fetchLoading && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Avatar card */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <Avatar name={name} />
            <div className="text-center">
              <p className="font-semibold text-gray-800 dark:text-white/90">{name || "Sin nombre"}</p>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{email || "—"}</p>
            </div>
            {!isNew && role && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  ROLE_STYLES[role] ?? "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                }`}
              >
                {role}
              </span>
            )}
            {!isNew && createdAt && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Creado el {new Date(createdAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Form card */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="email">Correo electrónico <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="password">
                  Contraseña {isNew && <span className="text-red-500">*</span>}
                  {!isNew && <span className="ml-1 text-xs text-gray-400">(dejar vacío para no cambiar)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isNew ? "Mínimo 6 caracteres" : "Nueva contraseña"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeIcon className="size-5 fill-current" />
                    ) : (
                      <EyeCloseIcon className="size-5 fill-current" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="role">Rol <span className="text-red-500">*</span></Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="STUDIO">STUDIO</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Guardando..." : isNew ? "Crear usuario" : "Guardar cambios"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/admin/users")}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

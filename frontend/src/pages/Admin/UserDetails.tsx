import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import UserService, { CreateUserDto, UpdateUserDto } from "./User.service";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "../../icons";

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

export default function UserDetails() {
  const { id } = useParams();
  const isNew = id === undefined;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("WAITER");
  const [active, setActive] = useState<boolean>(true);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    undefined,
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isNew) {
      const fetchUser = async () => {
        setFetchLoading(true);
        setError(null);
        try {
          const user = await UserService.fetchUserById(id as string);
          setName(user.name ?? "");
          setEmail(user.email ?? "");
          setRole(user.role ?? "WAITER");
          setActive(user.active ?? true);
          setCreatedAt(user.createdAt);
          setAvatarPreview(user.avatarUrl ?? undefined);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage || "Error al cargar usuario");
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

      // If editing and a new avatar file is selected, try to upload it first
      let uploadedAvatarUrl: string | undefined;
      if (!isNew && avatarFile) {
        try {
          setUploadingAvatar(true);
          uploadedAvatarUrl = await UserService.uploadUserAvatar(
            id as string,
            avatarFile,
          );
        } catch (err) {
          // don't block the save if avatar upload fails; show a warning
          // eslint-disable-next-line no-console
          console.warn("Avatar upload failed", err);
          setError(
            "No se pudo subir la foto de perfil (la edición se guardará sin foto).",
          );
        } finally {
          setUploadingAvatar(false);
        }
      }

      const createBody: CreateUserDto = password
        ? { name, email, role, password, active }
        : { name, email, role, active };

      if (isNew) {
        await UserService.createUser(createBody);
      } else {
        const updateBody: UpdateUserDto = password
          ? { name, email, role, password, active }
          : { name, email, role, active };
        if (uploadedAvatarUrl) updateBody.avatarUrl = uploadedAvatarUrl;
        await UserService.updateUser(id as string, updateBody);
      }

      navigate("/admin/users");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    applyAvatarFile(f);
  };

  const applyAvatarFile = (f: File) => {
    if (!f.type.startsWith("image/")) return;
    if (avatarObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      } catch {}
    }
    const url = URL.createObjectURL(f);
    avatarObjectUrlRef.current = url;
    setAvatarFile(f);
    setAvatarPreview(url);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) applyAvatarFile(f);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const removeAvatarFile = () => {
    if (avatarObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      } catch {}
      avatarObjectUrlRef.current = null;
    }
    setAvatarFile(null);
    setAvatarPreview(undefined);
  };

  // cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(avatarObjectUrlRef.current);
        } catch {}
      }
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {isNew ? "Nuevo usuario" : "Editar usuario"}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {isNew
              ? "Completa el formulario para crear un usuario"
              : "Actualiza los datos del usuario"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/users")}
        >
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
          {/* ── Avatar card ── */}
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            {/* Drop zone */}
            {!isNew ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition-colors
                  ${
                    isDragOver
                      ? "border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
                      : "border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-white/[0.02] dark:hover:border-brand-600 dark:hover:bg-brand-500/5"
                  }`}
              >
                {avatarPreview ? (
                  <>
                    <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-md dark:border-gray-800">
                      <img
                        src={avatarPreview}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                      {/* hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="text-white"
                        >
                          <path
                            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <polyline
                            points="17 8 12 3 7 8"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <line
                            x1="12"
                            y1="3"
                            x2="12"
                            y2="15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {avatarFile
                        ? avatarFile.name
                        : "Haz clic o arrastra para cambiar"}
                    </p>
                  </>
                ) : (
                  <>
                    {/* Initials placeholder */}
                    <div className="relative h-24 w-24">
                      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-3xl font-bold dark:bg-brand-500/20 dark:text-brand-400">
                        {(name || "?")
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => w[0]?.toUpperCase() ?? "")
                          .join("") || "?"}
                      </span>
                      <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-500 shadow dark:border-gray-900">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="text-white"
                        >
                          <path
                            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <polyline
                            points="17 8 12 3 7 8"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <line
                            x1="12"
                            y1="3"
                            x2="12"
                            y2="15"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isDragOver
                          ? "Suelta la imagen aquí"
                          : "Subir foto de perfil"}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                        PNG, JPG, WEBP · máx. 5 MB
                      </p>
                    </div>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={loading || uploadingAvatar}
                />
              </div>
            ) : (
              /* In create mode just show initials */
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-3xl font-bold dark:bg-brand-500/20 dark:text-brand-400">
                {(name || "?")
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? "")
                  .join("") || "?"}
              </div>
            )}

            {/* Remove button */}
            {!isNew && avatarPreview && (
              <button
                type="button"
                onClick={removeAvatarFile}
                className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <polyline
                    points="3 6 5 6 21 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Eliminar foto
              </button>
            )}

            {/* Name / email preview */}
            <div className="w-full border-t border-gray-100 pt-4 text-center dark:border-gray-800">
              <p className="font-semibold text-gray-800 dark:text-white/90">
                {name || "Sin nombre"}
              </p>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {email || "—"}
              </p>
            </div>

            {/* Role badge & date */}
            {!isNew && role && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  ROLE_STYLES[role] ??
                  "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
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

          {/* ── Form card ── */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-400">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mt-0.5 shrink-0"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <line
                    x1="12"
                    y1="8"
                    x2="12"
                    y2="12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="12"
                    y1="16"
                    x2="12.01"
                    y2="16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                {error}
              </div>
            )}

            <form
              onSubmit={handleSave}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              {/* Section title */}
              <div className="sm:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Información personal
                </h3>
                <div className="mt-2 h-px bg-gray-100 dark:bg-gray-800" />
              </div>

              <div>
                <Label htmlFor="name">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="email">
                  Correo electrónico <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Separator */}
              <div className="sm:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Acceso
                </h3>
                <div className="mt-2 h-px bg-gray-100 dark:bg-gray-800" />
              </div>

              <div>
                <Label htmlFor="password">
                  Contraseña {isNew && <span className="text-red-500">*</span>}
                  {!isNew && (
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      (vacío = sin cambio)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      isNew ? "Mínimo 6 caracteres" : "Nueva contraseña"
                    }
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
                <Label htmlFor="role">
                  Rol <span className="text-red-500">*</span>
                </Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                  <option value="WAITER">WAITER</option>
                  <option value="KITCHEN">KITCHEN</option>
                  <option value="CASHIER">CASHIER</option>
                </select>
              </div>

              {/* Active toggle */}
              <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-white/[0.02]">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estado del usuario
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {active
                      ? "El usuario puede iniciar sesión"
                      : "Acceso bloqueado"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  onClick={() => setActive((v) => !v)}
                  disabled={loading}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1
                    ${active ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform
                      ${active ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="sm:col-span-2 flex items-center gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || uploadingAvatar}
                >
                  {loading || uploadingAvatar ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Guardando...
                    </span>
                  ) : isNew ? (
                    "Crear usuario"
                  ) : (
                    "Guardar cambios"
                  )}
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

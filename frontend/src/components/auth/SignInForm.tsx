import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useSocket } from "../../hooks/useSocket";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { joinRooms } = useSocket();

  const getErrorMessage = (err: unknown): string => {
    if (typeof err === "string") return err;

    if (err && typeof err === "object") {
      const e = err as {
        message?: unknown;
        error?: unknown;
      };

      if (Array.isArray(e.message)) return e.message.join("; ");
      if (typeof e.message === "string") return e.message;
      if (typeof e.error === "string") return e.error;
    }

    return "Correo o contraseña incorrectos";
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    setError(null);
    // client-side validation to avoid backend 400 responses
    const isEmail = (em: string) => /\S+@\S+\.\S+/.test(em);
    if (!email || !password) {
      setError("Correo electrónico y contraseña son obligatorios");
      return;
    }
    if (!isEmail(email)) {
      setError("Por favor ingresa una dirección de correo válida");
      return;
    }
    if (String(password).length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      const data = response?.data;
      if (data?.accessToken) {
        localStorage.setItem("token", data.accessToken);
      }
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        try {
          if (joinRooms && data.user?.role) {
            await joinRooms([`role:${data.user.role}`, `user:${data.user.id}`]);
          }
        } catch (_) {
          // ignore join failures
        }
      }
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Iniciar sesión
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingresa tu correo y contraseña para iniciar sesión.
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {error && (
                  <p className="text-sm text-center text-red-500">{error}</p>
                )}
                <div>
                  <Label>
                    Correo electrónico{" "}
                    <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input
                    placeholder="ejemplo@correo.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label>
                    Contraseña <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link
                    to="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div>
                  <Button
                    className="w-full"
                    size="sm"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

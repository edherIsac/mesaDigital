import { useEffect, useState } from "react";
import UserService from "./User.service";
import { User } from "./User.interface";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";

export default function UsersAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ADMIN");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await UserService.fetchUsers();
      setUsers(data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || "Error al obtener usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!name || !email || !password) {
      setError("Todos los campos son obligatorios");
      return;
    }

    try {
      setLoading(true);

      const created = await UserService.createUser({ name, email, password, role });
      if (created) setUsers((s) => [created, ...s]);
      setName("");
      setEmail("");
      setPassword("");
      setRole("ADMIN");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || "Error al crear usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Administración de usuarios</h2>

      <section className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="font-medium mb-3">Crear usuario</h3>
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <Input
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="sm:col-span-3">
            <label className="block mb-1 text-sm font-medium">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-11 w-full rounded-lg border px-4 text-sm"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="SUPERVISOR">SUPERVISOR</option>
              <option value="WAITER">WAITER</option>
              <option value="KITCHEN">KITCHEN</option>
              <option value="CASHIER">CASHIER</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creando..." : "Crear usuario"}
            </Button>
          </div>
        </form>
      </section>

      <section className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="font-medium mb-3">Usuarios</h3>
        {loading && <p>Cargando...</p>}
        {!loading && users.length === 0 && <p>No hay usuarios.</p>}
        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-600">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Correo</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2">Creado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

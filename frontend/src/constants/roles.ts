export const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrador" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "WAITER", label: "Mesero" },
  { value: "KITCHEN", label: "Cocina" },
  { value: "CASHIER", label: "Cajero" },
];

export const ROLE_LABELS: Record<string, string> = ROLE_OPTIONS.reduce(
  (acc, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  },
  {} as Record<string, string>,
);

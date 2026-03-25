import React from "react";
import Badge from "../ui/badge/Badge";

export type POSItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  image?: string;
  notes?: string;
};

const formatCurrency = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

type POSListProps = {
  items: POSItem[];
  badgeVariant?: "light" | "solid";
  badgeColor?:
    | "primary"
    | "success"
    | "error"
    | "warning"
    | "info"
    | "light"
    | "dark";
  badgeSize?: "sm" | "md";
};

export default function POSList({
  items,
  badgeVariant = "light",
  badgeColor = "primary",
  badgeSize = "sm",
}: POSListProps) {
  return (
    <div className="rounded-lg bg-transparent shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-700">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 sticky top-0 bg-gray-900/70 z-10">Producto</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 sticky top-0 bg-gray-900/70 z-10">Cantidad</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 sticky top-0 bg-gray-900/70 z-10">Precio</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 sticky top-0 bg-gray-900/70 z-10">Importe</th>
          </tr>
        </thead>
        <tbody className="bg-transparent divide-y divide-gray-800">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-sm font-medium text-gray-300">
                        {item.name
                          .split(" ")
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-100 truncate">{item.name}</div>
                    {item.notes && <div className="text-xs text-gray-400 truncate">{item.notes}</div>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center text-sm text-gray-200">
                <Badge variant={badgeVariant} color={badgeColor} size={badgeSize}>{item.qty}</Badge>
              </td>
              <td className="px-4 py-3 text-center text-sm text-gray-200">{formatCurrency(item.unitPrice)}</td>
              <td className="px-4 py-3 text-center text-sm font-medium text-gray-100">{formatCurrency(item.qty * item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

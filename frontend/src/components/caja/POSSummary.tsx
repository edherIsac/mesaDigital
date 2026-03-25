import React from "react";

type Props = {
  subtotal: number;
  taxes?: number;
  total: number;
  onCharge?: () => void;
  onCancel?: () => void;
};

const formatCurrency = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

export default function POSSummary({ subtotal, taxes = 0, total, onCharge, onCancel }: Props) {
  return (
    <div className="rounded-lg bg-gray-900/30 p-4 shadow-sm">
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-400">
          <div>Subtotal</div>
          <div>{formatCurrency(subtotal)}</div>
        </div>
        <div className="flex justify-between mt-1 text-sm text-gray-400">
          <div>Impuestos</div>
          <div>{formatCurrency(taxes)}</div>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-4">
        <div className="flex justify-between items-baseline">
          <div className="text-sm text-gray-400">Total</div>
          <div className="text-2xl font-semibold text-gray-100">{formatCurrency(total)}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={onCharge}
          className="w-full inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Cobrar
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full inline-flex items-center justify-center rounded-lg border border-red-600 text-red-400 px-4 py-3 text-sm hover:bg-red-600/5"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

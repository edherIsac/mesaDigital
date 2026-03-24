import React from 'react';

type Props = {
  subtotal?: string;
  taxes?: string;
  total?: string;
  tipPlaceholder?: string;
  onPay?: () => void;
  onCancel?: () => void;
};

export function PaymentSummary({ subtotal = '—', taxes = '—', total = '—', tipPlaceholder = 'Agregar propina', onPay, onCancel }: Props) {
  return (
    <div className="sticky top-6">
      <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 shadow-lg flex flex-col gap-4">
        <div className="text-xs text-gray-400">Resumen</div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-300">
            <div>Subtotal</div>
            <div>{subtotal}</div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-300">
            <div>Impuestos (estimado)</div>
            <div>{taxes}</div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-300">
            <div>Propina</div>
            <div className="text-sm text-gray-400">{tipPlaceholder}</div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">Total</div>
            <div className="text-2xl font-extrabold text-white">{total}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={onPay} aria-label="Cobrar" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-lg shadow">Cobrar</button>
          <button onClick={onCancel} aria-label="Cancelar" className="w-full border border-red-600 text-red-600 bg-transparent py-2 rounded-lg">Cancelar</button>
          <button aria-label="Volver" className="w-full text-sm text-gray-400 py-2 rounded-lg hover:bg-gray-800">Volver</button>
        </div>
      </div>
    </div>
  );
}

export default PaymentSummary;

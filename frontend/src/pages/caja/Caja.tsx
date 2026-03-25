import React from "react";
import POSList, { POSItem } from "../../components/caja/POSList";
import POSSummary from "../../components/caja/POSSummary";

const MOCK_ITEMS: POSItem[] = [
  { id: "1", name: "Pizza Margherita", qty: 2, unitPrice: 8.5 },
  { id: "2", name: "Ensalada César", qty: 1, unitPrice: 6.0 },
  { id: "3", name: "Tacos al Pastor", qty: 3, unitPrice: 2.75 },
  { id: "4", name: "Agua mineral", qty: 2, unitPrice: 1.5 },
];

function calcSubtotal(items: POSItem[]) {
  return items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
}

export default function Caja(): React.ReactElement {
  const subtotal = calcSubtotal(MOCK_ITEMS);
  const taxes = +(subtotal * 0.1).toFixed(2); // placeholder
  const total = +(subtotal + taxes).toFixed(2);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 w-full">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Caja</h1>
          <div className="text-sm text-gray-400">Interfaz POS (UI solamente)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="rounded-lg bg-gray-900/10 p-4 shadow-sm">
            <POSList items={MOCK_ITEMS} />
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="sticky top-6">
            <POSSummary subtotal={subtotal} taxes={taxes} total={total} onCharge={() => {}} onCancel={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
}

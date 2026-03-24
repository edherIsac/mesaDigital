import React from 'react';
import { OrderItem } from '../../interfaces/Order.interface';

type Props = {
  item: OrderItem;
};

export function OrderItemRow({ item }: Props) {
  const name = item.name ?? '—';
  const notes = item.notes ?? item.note ?? undefined;
  const qty = item.quantity ?? item.qty ?? 1;
  const unitPrice = item.unitPrice ?? item.price ?? undefined;
  const productImages = [
    '/images/product/product-01.jpg',
    '/images/product/product-02.jpg',
    '/images/product/product-03.jpg',
    '/images/product/product-04.jpg',
    '/images/product/product-05.jpg',
  ];

  const hashString = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return Math.abs(h);
  };

  const idKey = String(item._id ?? item.id ?? item.name ?? '0');
  const fallback = productImages[hashString(idKey) % productImages.length];
  const imageUrl = item.coverImage ?? (item as any).product?.coverImage ?? fallback;

  const priceDisplay = unitPrice != null
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(unitPrice)
    : '—';

  // Intentionally no per-item total calculation here (presentation-only placeholder)
  const totalDisplay = '—';

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-800">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-700" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">{name}</div>
          {notes ? <div className="text-xs text-gray-400 truncate">{Array.isArray(notes) ? notes.join(', ') : String(notes)}</div> : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-300">x{qty}</div>
        <div className="text-sm text-gray-300">{priceDisplay}</div>
        <div className="text-sm font-semibold text-white">{totalDisplay}</div>
      </div>
    </div>
  );
}

export default OrderItemRow;

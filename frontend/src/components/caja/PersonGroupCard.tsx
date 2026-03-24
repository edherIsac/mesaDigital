import React from 'react';
import type { Person } from '../../../interfaces/Order.interface';
import { OrderItemRow } from './OrderItemRow';

type Props = {
  person: Person;
  initials?: string;
  avatarUrl?: string;
  personTotal?: string;
};

export function PersonGroupCard({ person, initials, avatarUrl, personTotal = '—' }: Props) {
  const items = person.orders ?? [];

  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt={person.name} className="w-12 h-12 rounded-md object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-md bg-brand-500 text-white flex items-center justify-center font-semibold">{initials ?? (person.name ? person.name.charAt(0) : '?')}</div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{person.name ?? 'Comensal'}</div>
            <div className="text-xs text-gray-400">{items.length} ítem{items.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div className="text-sm font-semibold text-white">{personTotal}</div>
      </div>

      <div className="space-y-3">
        {items.map((it, idx) => (
          <OrderItemRow key={it._id ?? it.id ?? idx} item={it} />
        ))}
      </div>
    </div>
  );
}

export default PersonGroupCard;

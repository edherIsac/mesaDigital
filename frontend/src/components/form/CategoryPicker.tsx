import { useState } from "react";
import { createPortal } from "react-dom";
import { Category, CATEGORY_GROUPS, CATEGORY_LABELS } from "../../constants/categories";

interface CategoryPickerProps {
  value: Category[];
  onChange: (value: Category[]) => void;
  disabled?: boolean;
}

export default function CategoryPicker({ value, onChange, disabled }: CategoryPickerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(CATEGORY_GROUPS.map((g) => g.label)),
  );

  const toggle = (cat: Category) => {
    if (value.includes(cat)) {
      onChange(value.filter((c) => c !== cat));
    } else {
      onChange([...value, cat]);
    }
  };

  const remove = (cat: Category) => {
    if (disabled) return;
    onChange(value.filter((c) => c !== cat));
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const modal = modalOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Seleccionar categorías"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setModalOpen(false)}
          />
          {/* Panel */}
          <div className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Seleccionar categorías
                </h3>
                {value.length > 0 && (
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {value.length} seleccionada{value.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.05] dark:hover:text-gray-300"
                aria-label="Cerrar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Scrollable groups */}
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {CATEGORY_GROUPS.map((group) => {
                const isOpen = openGroups.has(group.label);
                const selectedInGroup = group.items.filter((c) => value.includes(c)).length;
                return (
                  <div
                    key={group.label}
                    className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                    >
                      <span>{group.label}</span>
                      <span className="flex items-center gap-2">
                        {selectedInGroup > 0 && (
                          <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {selectedInGroup}
                          </span>
                        )}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="flex flex-wrap gap-1.5 border-t border-gray-100 p-3 dark:border-gray-700/50">
                        {group.items.map((cat) => {
                          const selected = value.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => toggle(cat)}
                              aria-pressed={selected}
                              className={`cursor-pointer select-none rounded-full border px-2.5 py-1 text-xs font-medium transition-all
                                ${
                                  selected
                                    ? "border-brand-500 bg-brand-500 text-white"
                                    : "border-gray-300 bg-white text-gray-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-600 dark:bg-transparent dark:text-gray-400 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                                }`}
                            >
                              {CATEGORY_LABELS[cat]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Footer */}
            <div className="border-t border-gray-200 px-5 py-3 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Listo
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div>
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
            >
              {CATEGORY_LABELS[cat]}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(cat)}
                  className="ml-0.5 text-brand-400 hover:text-brand-700 dark:hover:text-brand-200"
                  aria-label={`Quitar ${CATEGORY_LABELS[cat]}`}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Add button */}
      {!disabled && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Agregar categoría
        </button>
      )}

      {modal}
    </div>
  );
}

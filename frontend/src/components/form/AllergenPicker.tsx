import { Allergen, ALLERGEN_LABELS } from "../../constants/allergens";

const ALLERGEN_EMOJI: Record<Allergen, string> = {
  [Allergen.GLUTEN]:         "🌾",
  [Allergen.CRUSTACEOS]:     "🦐",
  [Allergen.HUEVO]:          "🥚",
  [Allergen.PESCADO]:        "🐟",
  [Allergen.CACAHUETE]:      "🥜",
  [Allergen.SOJA]:           "🫘",
  [Allergen.LACTEOS]:        "🥛",
  [Allergen.FRUTOS_CASCARA]: "🌰",
  [Allergen.APIO]:           "🥬",
  [Allergen.MOSTAZA]:        "🌻",
  [Allergen.SESAMO]:         "🌱",
  [Allergen.SULFITOS]:       "🍷",
  [Allergen.ALTRAMUCES]:     "🌼",
  [Allergen.MOLUSCOS]:       "🐚",
};

interface AllergenPickerProps {
  value: Allergen[];
  onChange: (value: Allergen[]) => void;
  disabled?: boolean;
}

export default function AllergenPicker({ value, onChange, disabled }: AllergenPickerProps) {
  const toggle = (allergen: Allergen) => {
    if (disabled) return;
    if (value.includes(allergen)) {
      onChange(value.filter((a) => a !== allergen));
    } else {
      onChange([...value, allergen]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {Object.values(Allergen).map((allergen) => {
        const selected = value.includes(allergen);
        return (
          <button
            key={allergen}
            type="button"
            onClick={() => toggle(allergen)}
            disabled={disabled}
            aria-pressed={selected}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all select-none
              ${selected
                ? "border-orange-400 bg-orange-400 text-white dark:border-orange-400 dark:bg-orange-500 dark:text-white"
                : "border-gray-300 bg-white text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:border-orange-500/50 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
              }
              ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
            `}
          >
            <span role="img" aria-label={ALLERGEN_LABELS[allergen]}>
              {ALLERGEN_EMOJI[allergen]}
            </span>
            {ALLERGEN_LABELS[allergen]}
          </button>
        );
      })}
    </div>
  );
}

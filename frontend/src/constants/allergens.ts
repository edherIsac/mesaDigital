export enum Allergen {
  GLUTEN = 'gluten',
  CRUSTACEOS = 'crustaceos',
  HUEVO = 'huevo',
  PESCADO = 'pescado',
  CACAHUETE = 'cacahuete',
  SOJA = 'soja',
  LACTEOS = 'lacteos',
  FRUTOS_CASCARA = 'frutos_cascara',
  APIO = 'apio',
  MOSTAZA = 'mostaza',
  SESAMO = 'sesamo',
  SULFITOS = 'sulfitos',
  ALTRAMUCES = 'altramuces',
  MOLUSCOS = 'moluscos',
}

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  [Allergen.GLUTEN]:         'Gluten',
  [Allergen.CRUSTACEOS]:     'Crustáceos',
  [Allergen.HUEVO]:          'Huevo',
  [Allergen.PESCADO]:        'Pescado',
  [Allergen.CACAHUETE]:      'Cacahuete',
  [Allergen.SOJA]:           'Soja',
  [Allergen.LACTEOS]:        'Lácteos',
  [Allergen.FRUTOS_CASCARA]: 'Frutos de cáscara',
  [Allergen.APIO]:           'Apio',
  [Allergen.MOSTAZA]:        'Mostaza',
  [Allergen.SESAMO]:         'Sésamo',
  [Allergen.SULFITOS]:       'Sulfitos',
  [Allergen.ALTRAMUCES]:     'Altramuces',
  [Allergen.MOLUSCOS]:       'Moluscos',
};

/** Array listo para iterar en selects, checkboxes o filtros */
export const ALLERGEN_OPTIONS = Object.values(Allergen).map((value) => ({
  value,
  label: ALLERGEN_LABELS[value],
}));

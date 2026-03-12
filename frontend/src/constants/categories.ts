export enum Category {
  // Antojitos & tortería
  TACOS = 'tacos',
  TORTAS = 'tortas',
  QUESADILLAS = 'quesadillas',
  TAMALES = 'tamales',
  ANTOJITOS = 'antojitos',
  TOSTADAS = 'tostadas',
  GORDITAS = 'gorditas',
  TLAYUDAS = 'tlayudas',
  ENFRIJOLADAS = 'enfrijoladas',
  ENCHILADAS = 'enchiladas',
  // Sopas & caldos
  SOPAS = 'sopas',
  CALDOS = 'caldos',
  POZOLE = 'pozole',
  MENUDO = 'menudo',
  // Carnes & proteínas
  CARNES = 'carnes',
  AVES = 'aves',
  MARISCOS = 'mariscos',
  PESCADOS = 'pescados',
  // Guarniciones & ensaladas
  ENSALADAS = 'ensaladas',
  GUARNICIONES = 'guarniciones',
  ARROCES = 'arroces',
  // Comida internacional
  PIZZAS = 'pizzas',
  HAMBURGUESAS = 'hamburguesas',
  PASTA = 'pasta',
  SUSHI = 'sushi',
  // Desayunos
  DESAYUNOS = 'desayunos',
  HUEVOS = 'huevos',
  HOTCAKES = 'hotcakes',
  // Botanas
  BOTANAS = 'botanas',
  ALITAS = 'alitas',
  NACHOS = 'nachos',
  // Postres & panadería
  POSTRES = 'postres',
  HELADOS = 'helados',
  PASTELES = 'pasteles',
  PANADERIA = 'panaderia',
  DULCES = 'dulces',
  // Bebidas
  BEBIDAS_FRIAS = 'bebidas_frias',
  BEBIDAS_CALIENTES = 'bebidas_calientes',
  JUGOS_LICUADOS = 'jugos_licuados',
  AGUAS_FRESCAS = 'aguas_frescas',
  REFRESCOS = 'refrescos',
  CERVEZAS = 'cervezas',
  VINOS = 'vinos',
  COCTELERIA = 'cocteleria',
  MEZCAL_TEQUILA = 'mezcal_tequila',
  // Especiales
  MENU_INFANTIL = 'menu_infantil',
  MENU_DEL_DIA = 'menu_del_dia',
  COMBOS = 'combos',
  VEGANO = 'vegano',
  SIN_GLUTEN = 'sin_gluten',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.TACOS]:             'Tacos',
  [Category.TORTAS]:            'Tortas',
  [Category.QUESADILLAS]:       'Quesadillas',
  [Category.TAMALES]:           'Tamales',
  [Category.ANTOJITOS]:         'Antojitos',
  [Category.TOSTADAS]:          'Tostadas',
  [Category.GORDITAS]:          'Gorditas',
  [Category.TLAYUDAS]:          'Tlayudas',
  [Category.ENFRIJOLADAS]:      'Enfrijoladas',
  [Category.ENCHILADAS]:        'Enchiladas',
  [Category.SOPAS]:             'Sopas',
  [Category.CALDOS]:            'Caldos',
  [Category.POZOLE]:            'Pozole',
  [Category.MENUDO]:            'Menudo',
  [Category.CARNES]:            'Carnes',
  [Category.AVES]:              'Aves',
  [Category.MARISCOS]:          'Mariscos',
  [Category.PESCADOS]:          'Pescados',
  [Category.ENSALADAS]:         'Ensaladas',
  [Category.GUARNICIONES]:      'Guarniciones',
  [Category.ARROCES]:           'Arroces',
  [Category.PIZZAS]:            'Pizzas',
  [Category.HAMBURGUESAS]:      'Hamburguesas',
  [Category.PASTA]:             'Pasta',
  [Category.SUSHI]:             'Sushi',
  [Category.DESAYUNOS]:         'Desayunos',
  [Category.HUEVOS]:            'Huevos',
  [Category.HOTCAKES]:          'Hotcakes',
  [Category.BOTANAS]:           'Botanas',
  [Category.ALITAS]:            'Alitas',
  [Category.NACHOS]:            'Nachos',
  [Category.POSTRES]:           'Postres',
  [Category.HELADOS]:           'Helados',
  [Category.PASTELES]:          'Pasteles',
  [Category.PANADERIA]:         'Panadería',
  [Category.DULCES]:            'Dulces',
  [Category.BEBIDAS_FRIAS]:     'Bebidas Frías',
  [Category.BEBIDAS_CALIENTES]: 'Bebidas Calientes',
  [Category.JUGOS_LICUADOS]:    'Jugos y Licuados',
  [Category.AGUAS_FRESCAS]:     'Aguas Frescas',
  [Category.REFRESCOS]:         'Refrescos',
  [Category.CERVEZAS]:          'Cervezas',
  [Category.VINOS]:             'Vinos',
  [Category.COCTELERIA]:        'Coctelería',
  [Category.MEZCAL_TEQUILA]:    'Mezcal y Tequila',
  [Category.MENU_INFANTIL]:     'Menú Infantil',
  [Category.MENU_DEL_DIA]:      'Menú del Día',
  [Category.COMBOS]:            'Combos',
  [Category.VEGANO]:            'Vegano',
  [Category.SIN_GLUTEN]:        'Sin Gluten',
};

export const CATEGORY_GROUPS: { label: string; items: Category[] }[] = [
  {
    label: 'Antojitos & Tortería',
    items: [
      Category.TACOS, Category.TORTAS, Category.QUESADILLAS, Category.TAMALES,
      Category.ANTOJITOS, Category.TOSTADAS, Category.GORDITAS, Category.TLAYUDAS,
      Category.ENFRIJOLADAS, Category.ENCHILADAS,
    ],
  },
  {
    label: 'Sopas & Caldos',
    items: [Category.SOPAS, Category.CALDOS, Category.POZOLE, Category.MENUDO],
  },
  {
    label: 'Carnes & Proteínas',
    items: [Category.CARNES, Category.AVES, Category.MARISCOS, Category.PESCADOS],
  },
  {
    label: 'Guarniciones & Ensaladas',
    items: [Category.ENSALADAS, Category.GUARNICIONES, Category.ARROCES],
  },
  {
    label: 'Comida Internacional',
    items: [Category.PIZZAS, Category.HAMBURGUESAS, Category.PASTA, Category.SUSHI],
  },
  {
    label: 'Desayunos',
    items: [Category.DESAYUNOS, Category.HUEVOS, Category.HOTCAKES],
  },
  {
    label: 'Botanas',
    items: [Category.BOTANAS, Category.ALITAS, Category.NACHOS],
  },
  {
    label: 'Postres & Panadería',
    items: [
      Category.POSTRES, Category.HELADOS, Category.PASTELES,
      Category.PANADERIA, Category.DULCES,
    ],
  },
  {
    label: 'Bebidas',
    items: [
      Category.BEBIDAS_FRIAS, Category.BEBIDAS_CALIENTES, Category.JUGOS_LICUADOS,
      Category.AGUAS_FRESCAS, Category.REFRESCOS, Category.CERVEZAS,
      Category.VINOS, Category.COCTELERIA, Category.MEZCAL_TEQUILA,
    ],
  },
  {
    label: 'Especiales',
    items: [
      Category.MENU_INFANTIL, Category.MENU_DEL_DIA,
      Category.COMBOS, Category.VEGANO, Category.SIN_GLUTEN,
    ],
  },
];

/** Array plano { value, label } para selects y filtros */
export const CATEGORY_OPTIONS = Object.values(Category).map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

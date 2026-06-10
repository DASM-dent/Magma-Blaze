export const DOMINICAN_MUNICIPALITIES: Record<string, readonly string[]> = {
  Azua: ['Azua', 'Estebanía', 'Guayabal', 'Las Charcas', 'Las Yayas de Viajama', 'Padre Las Casas', 'Peralta', 'Pueblo Viejo', 'Sabana Yegua', 'Tábara Arriba'],
  Baoruco: ['Neiba', 'Galván', 'Los Ríos', 'Tamayo', 'Villa Jaragua'],
  Barahona: ['Barahona', 'Cabral', 'El Peñón', 'Enriquillo', 'Fundación', 'Jaquimeyes', 'La Ciénaga', 'Las Salinas', 'Paraíso', 'Polo', 'Vicente Noble'],
  Dajabón: ['Dajabón', 'El Pino', 'Loma de Cabrera', 'Partido', 'Restauración'],
  'Distrito Nacional': ['Santo Domingo de Guzmán'],
  Duarte: ['San Francisco de Macorís', 'Arenoso', 'Castillo', 'Eugenio María de Hostos', 'Las Guáranas', 'Pimentel', 'Villa Riva'],
  'El Seibo': ['El Seibo', 'Miches'],
  'Elías Piña': ['Comendador', 'Bánica', 'El Llano', 'Hondo Valle', 'Juan Santiago', 'Pedro Santana'],
  Espaillat: ['Moca', 'Cayetano Germosén', 'Gaspar Hernández', 'Jamao al Norte', 'San Víctor'],
  'Hato Mayor': ['Hato Mayor', 'El Valle', 'Sabana de la Mar'],
  'Hermanas Mirabal': ['Salcedo', 'Tenares', 'Villa Tapia'],
  Independencia: ['Jimaní', 'Cristóbal', 'Duvergé', 'La Descubierta', 'Mella', 'Postrer Río'],
  'La Altagracia': ['Higüey', 'San Rafael del Yuma'],
  'La Romana': ['La Romana', 'Guaymate', 'Villa Hermosa'],
  'La Vega': ['La Vega', 'Constanza', 'Jarabacoa', 'Jima Abajo'],
  'María Trinidad Sánchez': ['Nagua', 'Cabrera', 'El Factor', 'Río San Juan'],
  'Monseñor Nouel': ['Bonao', 'Maimón', 'Piedra Blanca'],
  'Monte Cristi': ['Monte Cristi', 'Castañuelas', 'Guayubín', 'Las Matas de Santa Cruz', 'Pepillo Salcedo', 'Villa Vásquez'],
  'Monte Plata': ['Monte Plata', 'Bayaguana', 'Peralvillo', 'Sabana Grande de Boyá', 'Yamasá'],
  Pedernales: ['Pedernales', 'Oviedo'],
  Peravia: ['Baní', 'Matanzas', 'Nizao'],
  'Puerto Plata': ['Puerto Plata', 'Altamira', 'Guananico', 'Imbert', 'Los Hidalgos', 'Luperón', 'Sosúa', 'Villa Isabela', 'Villa Montellano'],
  Samaná: ['Samaná', 'Las Terrenas', 'Sánchez'],
  'San Cristóbal': ['San Cristóbal', 'Bajos de Haina', 'Cambita Garabitos', 'Los Cacaos', 'Sabana Grande de Palenque', 'San Gregorio de Nigua', 'Villa Altagracia', 'Yaguate'],
  'San José de Ocoa': ['San José de Ocoa', 'Rancho Arriba', 'Sabana Larga'],
  'San Juan': ['San Juan de la Maguana', 'Bohechío', 'El Cercado', 'Juan de Herrera', 'Las Matas de Farfán', 'Vallejuelo'],
  'San Pedro de Macorís': ['San Pedro de Macorís', 'Consuelo', 'Guayacanes', 'Quisqueya', 'Ramón Santana', 'San José de Los Llanos'],
  'Sánchez Ramírez': ['Cotuí', 'Cevicos', 'Fantino', 'La Mata'],
  Santiago: ['Santiago', 'Baitoa', 'Bisonó', 'Jánico', 'Licey al Medio', 'Puñal', 'Sabana Iglesia', 'San José de las Matas', 'Tamboril', 'Villa González'],
  'Santiago Rodríguez': ['Sabaneta', 'Los Almácigos', 'Monción'],
  'Santo Domingo': ['Santo Domingo Este', 'Boca Chica', 'Los Alcarrizos', 'Pedro Brand', 'San Antonio de Guerra', 'Santo Domingo Norte', 'Santo Domingo Oeste'],
  Valverde: ['Mao', 'Esperanza', 'Laguna Salada'],
};

export const DOMINICAN_PROVINCES = Object.keys(DOMINICAN_MUNICIPALITIES);

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
  'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
] as const;

export function municipalitiesFor(province: string) {
  return DOMINICAN_MUNICIPALITIES[province] ?? [];
}

export function normalizeLocation(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

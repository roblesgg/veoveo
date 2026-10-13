/**
 * ARCHIVO: constants/carruseles.ts
 * DESCRIPCIÓN: Catálogo de carruseles de Descubrir. Cada uno dice exactamente qué pide a TMDB.
 * - Estrenos y próximamente, con región ES (fechas reales de estreno en España).
 * - Géneros con un mínimo de votos para que no salgan pelis desconocidas.
 * - Temas (superhéroes, zombis…) con palabras clave de TMDB, no con géneros mezclados.
 * - Sin páginas al azar: se empieza por la página 1 y se carga más al llegar al final.
 * Ids de palabras clave comprobados contra la API de TMDB el 13-10-2026.
 */

export type DefinicionCarrusel = {
  id: string;
  titulo: string;
  grupo: 'Para ti' | 'Cartelera' | 'Listas' | 'Épocas' | 'Géneros' | 'Temas';
  /** Ruta de TMDB y parámetros fijos. Ausente en los carruseles calculados (Recomendado para ti). */
  ruta?: string;
  params?: Record<string, string>;
};

const VOTOS_GENERO = '200';

const genero = (id: string, titulo: string, generos: string, extra: Record<string, string> = {}): DefinicionCarrusel => ({
  id,
  titulo,
  grupo: 'Géneros',
  ruta: 'discover/movie',
  params: { with_genres: generos, 'vote_count.gte': VOTOS_GENERO, sort_by: 'popularity.desc', ...extra },
});

const tema = (id: string, titulo: string, keywords: string): DefinicionCarrusel => ({
  id,
  titulo,
  grupo: 'Temas',
  ruta: 'discover/movie',
  params: { with_keywords: keywords, 'vote_count.gte': '50', sort_by: 'popularity.desc' },
});

const epoca = (id: string, titulo: string, desde: string, hasta: string, votos: string): DefinicionCarrusel => ({
  id,
  titulo,
  grupo: 'Épocas',
  ruta: 'discover/movie',
  params: {
    'primary_release_date.gte': desde,
    'primary_release_date.lte': hasta,
    'vote_count.gte': votos,
    sort_by: 'popularity.desc',
  },
});

export const CATALOGO_CARRUSELES: DefinicionCarrusel[] = [
  { id: 'para-ti', titulo: 'Recomendado para ti', grupo: 'Para ti' },

  { id: 'en-cartelera', titulo: 'En cines', grupo: 'Cartelera', ruta: 'movie/now_playing', params: { region: 'ES' } },
  { id: 'proximamente', titulo: 'Próximamente', grupo: 'Cartelera', ruta: 'movie/upcoming', params: { region: 'ES' } },

  { id: 'tendencias', titulo: 'Tendencias de la semana', grupo: 'Listas', ruta: 'trending/movie/week' },
  { id: 'populares', titulo: 'Populares', grupo: 'Listas', ruta: 'movie/popular', params: { region: 'ES' } },
  { id: 'mejor-valoradas', titulo: 'Mejor valoradas', grupo: 'Listas', ruta: 'movie/top_rated' },

  epoca('decada-2010', 'Cine de los 2010', '2010-01-01', '2019-12-31', '1000'),
  epoca('decada-2000', 'Cine de los 2000', '2000-01-01', '2009-12-31', '1000'),
  epoca('decadas-80-90', 'Cine de los 80 y 90', '1980-01-01', '1999-12-31', '1000'),
  epoca('decada-70', 'Cine de los 70', '1970-01-01', '1979-12-31', '500'),
  epoca('decada-60', 'Cine de los 60', '1960-01-01', '1969-12-31', '300'),
  epoca('decada-50', 'Cine de los 50', '1950-01-01', '1959-12-31', '200'),
  {
    id: 'clasicos',
    titulo: 'Clásicos de oro',
    grupo: 'Épocas',
    ruta: 'discover/movie',
    params: { 'primary_release_date.lte': '1949-12-31', 'vote_count.gte': '500', sort_by: 'vote_average.desc' },
  },

  genero('accion', 'Acción', '28'),
  genero('animacion', 'Animación', '16', { without_original_language: 'ja' }),
  genero('anime', 'Anime', '16', { with_original_language: 'ja' }),
  genero('aventura', 'Aventura', '12'),
  genero('belica', 'Bélica', '10752'),
  genero('ciencia-ficcion', 'Ciencia ficción', '878'),
  genero('comedia', 'Comedia', '35'),
  // Coma = Y: comedias que además son románticas
  genero('comedia-romantica', 'Comedia romántica', '35,10749'),
  genero('crimen', 'Crimen', '80'),
  genero('documental', 'Documental', '99', { 'vote_count.gte': '50' }),
  genero('drama', 'Drama', '18'),
  genero('familia', 'Para ver en familia', '10751'),
  genero('fantasia', 'Fantasía', '14'),
  genero('historia', 'Historia', '36'),
  genero('misterio', 'Misterio', '9648'),
  genero('musica', 'Música y musicales', '10402'),
  genero('romance', 'Romance', '10749'),
  genero('suspense', 'Suspense', '53'),
  genero('terror', 'Terror', '27'),
  // Thriller psicológico: suspense Y misterio
  genero('thriller-psicologico', 'Thriller psicológico', '53,9648'),
  genero('western', 'Western', '37'),

  tema('superheroes', 'Superhéroes', '9715'),
  tema('zombis', 'Zombis', '12377'),
  tema('samurais', 'Samuráis', '1462'),
  tema('cine-negro', 'Cine negro', '9807'),
  // Barra = O: cualquiera de las dos palabras clave
  tema('espacio', 'El espacio', '9882|252634'),
  tema('atracos', 'Atracos', '10051'),
  tema('viajes-en-el-tiempo', 'Viajes en el tiempo', '4379'),
];

const POR_ID = new Map(CATALOGO_CARRUSELES.map((c) => [c.id, c]));

export function obtenerCarrusel(id: string): DefinicionCarrusel | undefined {
  return POR_ID.get(id);
}

export const CARRUSELES_POR_DEFECTO = [
  'para-ti',
  'en-cartelera',
  'proximamente',
  'tendencias',
  'populares',
  'mejor-valoradas',
];

/**
 * Nombres que se guardaban antes de la 3.0 (en el móvil y en Firestore) → id nuevo.
 * Lo que no esté aquí ni sea un id del catálogo se descarta.
 */
const NOMBRES_ANTIGUOS: Record<string, string> = {
  'Tendencias Semanales': 'tendencias',
  Tendencias: 'tendencias',
  'Populares Ahora': 'populares',
  Populares: 'populares',
  'Estrenos en Cartelera': 'en-cartelera',
  Próximamente: 'proximamente',
  'Mejor Valoradas': 'mejor-valoradas',
  'Interesante para ti': 'para-ti',
  'Cine de los 80/90': 'decadas-80-90',
  'Joyas de los 80/90': 'decadas-80-90',
  'Cine de los 70': 'decada-70',
  'Cine de los 60': 'decada-60',
  'Cine de los 50': 'decada-50',
  'Clásicos de Oro': 'clasicos',
  Clásicas: 'clasicos',
  Acción: 'accion',
  'Acción y Pura Adrenalina': 'accion',
  Animación: 'animacion',
  Anime: 'anime',
  Aventura: 'aventura',
  Bélica: 'belica',
  'Ciencia Ficción': 'ciencia-ficcion',
  'Cine Negro': 'cine-negro',
  Comedia: 'comedia',
  'Comedia Romántica': 'comedia-romantica',
  Crimen: 'crimen',
  Policíaca: 'crimen',
  Policial: 'crimen',
  Documental: 'documental',
  Drama: 'drama',
  Espacio: 'espacio',
  Familia: 'familia',
  Fantasía: 'fantasia',
  Historia: 'historia',
  Misterio: 'misterio',
  Musical: 'musica',
  Música: 'musica',
  Romance: 'romance',
  Samuráis: 'samurais',
  Superhéroes: 'superheroes',
  Suspense: 'suspense',
  Terror: 'terror',
  'Thriller Psicológico': 'thriller-psicologico',
  Western: 'western',
  Zombis: 'zombis',
};

/** Convierte una lista guardada (ids o nombres antiguos) en ids válidos, sin repetidos. */
export function migrarCarruseles(guardados: unknown): string[] {
  if (!Array.isArray(guardados)) return [...CARRUSELES_POR_DEFECTO];
  const ids = guardados
    .map((v) => (typeof v === 'string' ? (POR_ID.has(v) ? v : NOMBRES_ANTIGUOS[v]) : undefined))
    .filter((v): v is string => Boolean(v));
  const unicos = [...new Set(ids)];
  return unicos.length > 0 ? unicos : [...CARRUSELES_POR_DEFECTO];
}

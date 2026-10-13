/**
 * ARCHIVO: services/tmdbQueries.ts
 * DESCRIPCIÓN: Consultas de alto nivel a TMDB para los carruseles de Descubrir.
 */

import { obtenerCarrusel } from '../constants/carruseles';
import { tmdbApi } from './tmdbClient';
import type { MovieResponse } from '../types';

/** Páginas como máximo que se cargan en un carrusel (20 pelis por página). */
export const MAX_PAGINAS_CARRUSEL = 5;

/** Una página de un carrusel del catálogo. Las pelis sin póster se descartan. */
export async function fetchPaginaCarrusel(id: string, pagina: number): Promise<MovieResponse> {
  const def = obtenerCarrusel(id);
  if (!def?.ruta) throw new Error(`Carrusel sin consulta: ${id}`);
  const res = await tmdbApi.listaPeliculas(def.ruta, def.params, pagina);
  return { ...res, results: res.results.filter((m) => m.poster_path) };
}

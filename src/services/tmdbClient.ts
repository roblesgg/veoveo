/**
 * ARCHIVO: services/tmdbClient.ts
 * DESCRIPCIÓN: Cliente para la API de The Movie Database (TMDB).
 * Gestiona todas las peticiones relacionadas con películas, actores, géneros y recomendaciones.
 * Implementa caché local para proveedores de streaming para optimizar el rendimiento.
 */

import type {
  ActorDetails,
  ActorMovieCredits,
  CollectionDetails,
  CreditsResponse,
  MovieDetails,
  MovieResponse,
  WatchProvidersResponse,
} from '../types';
import * as preferences from '../storage/preferences';
import { env } from '../config/env';
import { contarPeticionTmdb } from '../utils/medicionArranque';

// URL base de la API de TMDB v3
const BASE_URL = 'https://api.themoviedb.org/3/';

// Caché en memoria para evitar peticiones repetitivas de proveedores (JustWatch) en listas
const providerCache = new Map<number, WatchProvidersResponse>();
const movieDetailsCache = new Map<number, MovieDetails>();
const movieCreditsCache = new Map<number, CreditsResponse>();
const collectionCache = new Map<number, CollectionDetails>();
const actorDetailsCache = new Map<number, ActorDetails>();
const actorMoviesCache = new Map<number, ActorMovieCredits>();

async function getOrFetchCached<TKey, TValue>(
  cache: Map<TKey, TValue>,
  key: TKey,
  fetcher: () => Promise<TValue>,
): Promise<TValue> {
  const cached = cache.get(key);
  if (cached) return cached;

  const value = await fetcher();
  cache.set(key, value);
  return value;
}

/**
 * Recupera el token de lectura (Bearer) desde las variables de entorno.
 */
function getBearer(): string {
  return env.tmdbReadToken;
}

/**
 * Función genérica para realizar peticiones fetch a TMDB con autenticación Bearer.
 */
async function tmdbFetch<T>(path: string): Promise<T> {
  contarPeticionTmdb();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${getBearer()}`,
      accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

/**
 * OBJETO: tmdbApi
 * Contiene todos los métodos organizados para interactuar con TMDB.
 * Sincronizado con la lógica de ApiService.kt del proyecto original.
 */
export const tmdbApi = {
  /** Busca películas por texto libre */
  async buscarPeliculas(nombrePelicula: string, idioma = 'es-ES') {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    const q = encodeURIComponent(nombrePelicula);
    return tmdbFetch<MovieResponse>(
      `search/movie?query=${q}&language=${idioma}&include_adult=${incluirAdulto}`,
    );
  },

  /** Descubre películas filtrando por género */
  async buscarPeliculasPorGenero(
    generoId: string,
    idioma = 'es-ES',
    orden = 'popularity.desc',
    pagina = 1,
  ) {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return tmdbFetch<MovieResponse>(
      `discover/movie?with_genres=${encodeURIComponent(generoId)}&language=${idioma}&sort_by=${encodeURIComponent(orden)}&page=${pagina}&include_adult=${incluirAdulto}`,
    );
  },

  /** Obtiene las películas más populares actualmente */
  async obtenerPopulares(idioma = 'es-ES', pagina = 1) {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return tmdbFetch<MovieResponse>(
      `movie/popular?language=${idioma}&page=${pagina}&include_adult=${incluirAdulto}`,
    );
  },

  /** Obtiene películas que están ahora mismo en cines */
  async obtenerEnCartelera(idioma = 'es-ES', pagina = 1) {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return tmdbFetch<MovieResponse>(
      `movie/now_playing?language=${idioma}&page=${pagina}&include_adult=${incluirAdulto}`,
    );
  },

  /** Obtiene las películas con mejor puntuación histórica */
  async obtenerMejorValoradas(idioma = 'es-ES', pagina = 1) {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return tmdbFetch<MovieResponse>(
      `movie/top_rated?language=${idioma}&page=${pagina}&include_adult=${incluirAdulto}`,
    );
  },

  /** Obtiene tendencias (diarias o semanales) */
  async obtenerTendencias(idioma = 'es-ES', periodo: 'day' | 'week' = 'week') {
    return tmdbFetch<MovieResponse>(`trending/movie/${periodo}?language=${idioma}`);
  },

  /** Lista de películas de cualquier ruta de TMDB (carruseles del catálogo). */
  async listaPeliculas(ruta: string, params: Record<string, string> = {}, pagina = 1, idioma = 'es-ES') {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    const query = new URLSearchParams({
      language: idioma,
      page: String(pagina),
      include_adult: String(incluirAdulto),
      ...params,
    });
    return tmdbFetch<MovieResponse>(`${ruta}?${query.toString()}`);
  },

  /** Películas similares a una dada */
  async obtenerSimilares(movieId: number, idioma = 'es-ES') {
    return tmdbFetch<MovieResponse>(`movie/${movieId}/similar?language=${idioma}&page=1`);
  },

  /** Acceso directo a discover para filtros personalizados complejos */
  async descubrirPeliculas(filtros: string, idioma = 'es-ES', pagina = 1) {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return tmdbFetch<MovieResponse>(
      `discover/movie?language=${idioma}&page=${pagina}&include_adult=${incluirAdulto}&${filtros}`,
    );
  },

  /** Obtiene toda la información detallada de una película específica */
  async obtenerDetallesPelicula(movieId: number, idioma = 'es-ES') {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return getOrFetchCached(movieDetailsCache, movieId, () =>
      tmdbFetch<MovieDetails>(
        `movie/${movieId}?language=${idioma}&include_adult=${incluirAdulto}&append_to_response=videos`,
      ),
    );
  },

  /** Obtiene el reparto (cast) y equipo técnico (crew) de una película */
  async obtenerCreditosPelicula(movieId: number, idioma = 'es-ES') {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return getOrFetchCached(movieCreditsCache, movieId, () =>
      tmdbFetch<CreditsResponse>(
        `movie/${movieId}/credits?language=${idioma}&include_adult=${incluirAdulto}`,
      ),
    );
  },

  /** Obtiene las plataformas donde se puede ver la película (JustWatch) */
  async obtenerDondeVer(movieId: number) {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return tmdbFetch<WatchProvidersResponse>(
      `movie/${movieId}/watch/providers?include_adult=${incluirAdulto}`,
    );
  },

  /** Versión de obtenerDondeVer que utiliza caché para no saturar la API en carruseles */
  async obtenerDondeVerConCache(movieId: number): Promise<WatchProvidersResponse> {
    const cached = providerCache.get(movieId);
    if (cached) return cached;
    const res = await this.obtenerDondeVer(movieId);
    providerCache.set(movieId, res);
    return res;
  },

  /** Obtiene biografía y detalles de un actor/persona */
  async obtenerDetallesActor(actorId: number, idioma = 'es-ES') {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return getOrFetchCached(actorDetailsCache, actorId, () =>
      tmdbFetch<ActorDetails>(
        `person/${actorId}?language=${idioma}&include_adult=${incluirAdulto}`,
      ),
    );
  },

  /** Obtiene la filmografía completa de un actor */
  async obtenerPeliculasActor(actorId: number, idioma = 'es-ES') {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return getOrFetchCached(actorMoviesCache, actorId, () =>
      tmdbFetch<ActorMovieCredits>(
        `person/${actorId}/movie_credits?language=${idioma}&include_adult=${incluirAdulto}`,
      ),
    );
  },

  /** Obtiene detalles de una colección (sagas como Star Wars, Marvel, etc.) */
  async obtenerColeccion(collectionId: number, idioma = 'es-ES') {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return getOrFetchCached(collectionCache, collectionId, () =>
      tmdbFetch<CollectionDetails>(
        `collection/${collectionId}?language=${idioma}&include_adult=${incluirAdulto}`,
      ),
    );
  },

  /** Obtiene recomendaciones automáticas basadas en una película */
  async obtenerRecomendaciones(movieId: number, idioma = 'es-ES', pagina = 1) {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return tmdbFetch<MovieResponse>(
      `movie/${movieId}/recommendations?language=${idioma}&page=${pagina}&include_adult=${incluirAdulto}`,
    );
  },

  /** Obtiene los proveedores disponibles en una región específica (ej: ES, US) */
  async obtenerProveedoresRegion(region = 'ES', idioma = 'es-ES') {
    return tmdbFetch<{ results: any[] }>(
      `watch/providers/movie?language=${idioma}&watch_region=${region}`,
    );
  },

  /** Busca personas/actores por nombre */
  async buscarActores(query: string, idioma = 'es-ES') {
    const incluirAdulto = await preferences.cargarPreferenciaAdulto();
    return tmdbFetch<any>(
      `search/person?query=${encodeURIComponent(query)}&language=${idioma}&include_adult=${incluirAdulto}`,
    );
  },
};

/**
 * HELPER: Construye la URL completa de una imagen de póster de TMDB.
 */
export function posterUrl(
  posterPath: string | null | undefined,
  width: 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w185',
): string | null {
  if (!posterPath) return null;
  return `https://image.tmdb.org/t/p/${width}${posterPath}`;
}

/** URL del logo de una plataforma (tamaño pequeño, para listas). */
export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w92${path}`;
}

/**
 * HELPER: Construye la URL completa de una imagen de perfil de actor.
 */
export function profileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w185${path}`;
}

/**
 * ARCHIVO: hooks/useDescubrir.ts
 * DESCRIPCIÓN: Datos de los carruseles de Descubrir con TanStack Query.
 * Cada carrusel pide lo suyo solo cuando se monta: la lista de Descubrir
 * solo monta los que están en pantalla o a punto de entrar.
 */

import { useInfiniteQuery, useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { fetchPaginaCarrusel, MAX_PAGINAS_CARRUSEL } from '../services/tmdbQueries';
import { tmdbApi } from '../services/tmdbClient';
import { calcularRecomendaciones, claveDelDia, elegirSemillas } from '../services/recomendaciones';
import { obtenerFavoritasDeAmigos } from '../services/repositorioSocial';
import { useBiblioteca } from '../context/BibliotecaContext';
import { useAuth } from '../context/AuthContext';
import type { Movie } from '../types';

const MEDIA_HORA = 1000 * 60 * 30;
const DOCE_HORAS = 1000 * 60 * 60 * 12;
const UNA_SEMANA = 1000 * 60 * 60 * 24 * 7;

/** Películas de un carrusel del catálogo, página a página. Se guardan en el móvil. */
export function useCarrusel(id: string, activo = true) {
  const consulta = useInfiniteQuery({
    queryKey: ['carousel', id],
    queryFn: ({ pageParam }) => fetchPaginaCarrusel(id, pageParam),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.page < Math.min(ultima.total_pages, MAX_PAGINAS_CARRUSEL) ? ultima.page + 1 : undefined,
    staleTime: MEDIA_HORA,
    retry: 1,
    enabled: activo,
    meta: { persistir: true },
  });

  const peliculas = useMemo(() => {
    const vistos = new Set<number>();
    const lista: Movie[] = [];
    consulta.data?.pages.forEach((p) =>
      p.results.forEach((m) => {
        if (!vistos.has(m.id)) {
          vistos.add(m.id);
          lista.push(m);
        }
      }),
    );
    return lista;
  }, [consulta.data]);

  return { ...consulta, peliculas };
}

/**
 * "Recomendado para ti". Se recalcula como mucho cada 12 horas o cuando cambian tus favoritas,
 * para gastar pocas llamadas a TMDB y pocas lecturas de Firestore.
 */
export function useRecomendaciones(activo = true) {
  const { user } = useAuth();
  const { vistas, porVer, cargando } = useBiblioteca();
  const dia = claveDelDia();
  const firmaSemillas = elegirSemillas(vistas, dia)
    .map((s) => `${s.idPelicula}:${s.valoracion}`)
    .join(',');

  return useQuery({
    queryKey: ['recomendaciones', user?.uid, dia, firmaSemillas],
    queryFn: async () => {
      const amigos = await obtenerFavoritasDeAmigos().catch(() => []);
      return calcularRecomendaciones(vistas, porVer, amigos, dia);
    },
    enabled: activo && Boolean(user) && !cargando,
    staleTime: DOCE_HORAS,
    gcTime: DOCE_HORAS,
    meta: { persistir: true },
  });
}

/** Recarga de todos los carruseles (tirar hacia abajo) y estado de carga global. */
export function useRecargaCarruseles() {
  const queryClient = useQueryClient();
  const cargando = useIsFetching({ queryKey: ['carousel'] }) > 0;

  const recargarTodos = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['carousel'] });
  }, [queryClient]);

  return { cargando, recargarTodos };
}

/**
 * Plataformas de España (suscripción y alquiler o compra) de una peli.
 * Solo se pide si hace falta, y se guarda una semana.
 */
export function usePlataformasPelicula(movieId: number, activa: boolean) {
  return useQuery({
    queryKey: ['plataformas', movieId],
    queryFn: () => obtenerPlataformasES(movieId),
    enabled: activa,
    staleTime: UNA_SEMANA,
    gcTime: UNA_SEMANA,
    meta: { persistir: true },
  });
}

export async function obtenerPlataformasES(movieId: number) {
  const res = await tmdbApi.obtenerDondeVerConCache(movieId);
  const es = res.results.ES;
  return {
    flatrate: es?.flatrate?.map((p) => p.provider_id) ?? [],
    rent: [...(es?.rent ?? []), ...(es?.buy ?? [])].map((p) => p.provider_id),
  };
}

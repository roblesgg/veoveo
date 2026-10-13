/**
 * ARCHIVO: hooks/useDescubrir.ts
 * DESCRIPCIÓN: Datos de los carruseles de Descubrir con TanStack Query.
 * Cada carrusel pide lo suyo solo cuando se monta: la lista de Descubrir
 * solo monta los que están en pantalla o a punto de entrar.
 */

import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { fetchCarouselData } from '../services/tmdbQueries';
import { tmdbApi } from '../services/tmdbClient';

const MEDIA_HORA = 1000 * 60 * 30;
const UNA_SEMANA = 1000 * 60 * 60 * 24 * 7;

/** Películas de un carrusel. Se guardan en el móvil para el próximo arranque. */
export function useCarrusel(titulo: string) {
  return useQuery({
    queryKey: ['carousel', titulo],
    queryFn: () => fetchCarouselData(titulo),
    staleTime: MEDIA_HORA,
    retry: 1,
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

  const recargarCarrusel = useCallback(
    (titulo: string) => {
      void queryClient.invalidateQueries({ queryKey: ['carousel', titulo] });
    },
    [queryClient],
  );

  return { cargando, recargarTodos, recargarCarrusel };
}

/**
 * Plataformas de España (suscripción y alquiler o compra) de una peli.
 * Solo se pide si el usuario ha elegido sus plataformas, y se guarda una semana.
 */
export function usePlataformasPelicula(movieId: number, activa: boolean) {
  return useQuery({
    queryKey: ['plataformas', movieId],
    queryFn: async () => {
      const res = await tmdbApi.obtenerDondeVerConCache(movieId);
      const es = res.results.ES;
      return {
        flatrate: es?.flatrate?.map((p) => p.provider_id) ?? [],
        rent: [...(es?.rent ?? []), ...(es?.buy ?? [])].map((p) => p.provider_id),
      };
    },
    enabled: activa,
    staleTime: UNA_SEMANA,
    gcTime: UNA_SEMANA,
    meta: { persistir: true },
  });
}

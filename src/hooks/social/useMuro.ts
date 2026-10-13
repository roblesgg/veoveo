/**
 * Muro de Social con caché (TanStack Query, persistida): las secciones de cargarMuro y,
 * además, "por categorías" a partir de los géneros de TMDB (cada peli se pide una vez).
 */
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { cargarMuro, type PeliDeAmigos } from '../../services/muroAmigos';
import { tmdbApi } from '../../services/tmdbClient';
import type { UsuarioPerfil } from '../../types';

const QUINCE_MINUTOS = 15 * 60 * 1000;
const UNA_SEMANA = 7 * 24 * 60 * 60 * 1000;
const MAX_PELIS_CON_GENERO = 40;
const MAX_CATEGORIAS = 4;

export type Categoria = { genero: string; pelis: PeliDeAmigos[] };

export function useMuro(amigos: UsuarioPerfil[]) {
  const clave = useMemo(
    () =>
      amigos
        .map((a) => a.uid)
        .sort()
        .join(','),
    [amigos],
  );
  const muro = useQuery({
    queryKey: ['muro', clave],
    queryFn: () => cargarMuro(amigos),
    enabled: amigos.length > 0,
    staleTime: QUINCE_MINUTOS,
    meta: { persistir: true },
  });

  // Todas las pelis del muro, sin repetir, con los amigos que las tienen
  const todas = useMemo(() => {
    const mapa = new Map<number, PeliDeAmigos>();
    const sumar = (p: PeliDeAmigos) => {
      const e = mapa.get(p.idPelicula);
      if (!e) mapa.set(p.idPelicula, { ...p, amigos: [...p.amigos] });
      else e.amigos = [...new Set([...e.amigos, ...p.amigos])];
    };
    muro.data?.favoritas.forEach(sumar);
    muro.data?.porVer.forEach(sumar);
    muro.data?.vistasRecientes.forEach(({ amigo, peli }) =>
      sumar({
        idPelicula: peli.idPelicula,
        titulo: peli.titulo,
        rutaPoster: peli.rutaPoster,
        amigos: [amigo],
        fecha: peli.fechaVisto ?? 0,
      }),
    );
    return [...mapa.values()].slice(0, MAX_PELIS_CON_GENERO);
  }, [muro.data]);

  const generos = useQueries({
    queries: todas.map((p) => ({
      queryKey: ['generos', p.idPelicula],
      queryFn: async () =>
        (await tmdbApi.obtenerDetallesPelicula(p.idPelicula)).genres.map((g) => g.name),
      staleTime: UNA_SEMANA,
      meta: { persistir: true },
    })),
  });
  const firmaGeneros = generos.map((g) => g.dataUpdatedAt).join(',');

  const categorias = useMemo<Categoria[]>(() => {
    const porGenero = new Map<string, PeliDeAmigos[]>();
    todas.forEach((p, i) => {
      generos[i]?.data?.forEach((g) => porGenero.set(g, [...(porGenero.get(g) ?? []), p]));
    });
    return [...porGenero.entries()]
      .filter(([, pelis]) => pelis.length >= 3)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, MAX_CATEGORIAS)
      .map(([genero, pelis]) => ({ genero, pelis }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todas, firmaGeneros]);

  return {
    muro: muro.data,
    cargando: muro.isLoading,
    error: muro.isError,
    recargar: muro.refetch,
    refrescando: muro.isRefetching,
    categorias,
  };
}

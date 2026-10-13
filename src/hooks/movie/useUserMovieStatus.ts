/**
 * ARCHIVO: hooks/movie/useUserMovieStatus.ts
 * DESCRIPCIÓN: Estado de una peli en la biblioteca del usuario y sus acciones:
 * Por ver, marcar como vista, valorar, cambiar la fecha de vista y quitarla.
 * Lee de la biblioteca compartida (BibliotecaContext), así que no hace lecturas extra:
 * cada escritura se refleja sola por la escucha de Firestore.
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBiblioteca } from '../../context/BibliotecaContext';
import {
  actualizarFechaVisto,
  actualizarValoracion,
  eliminarPelicula,
  guardarEnPorVer,
  marcarComoVista,
  type DatosPeliculaBiblioteca,
} from '../../services/repositorioPeliculasUsuario';
import type { MovieDetails, WatchProvider } from '../../types';

type ProveedoresES = { flatrate?: WatchProvider[]; rent?: WatchProvider[]; buy?: WatchProvider[] };

/**
 * @param movieId ID de TMDB.
 * @param detalles Datos de la película (necesarios para el alta en Firestore).
 * @param providers Plataformas en España (para los filtros de la biblioteca).
 */
export function useUserMovieStatus(
  movieId: number,
  detalles: MovieDetails | null,
  providers?: ProveedoresES | null,
) {
  const { user } = useAuth();
  const { obtener, cargando } = useBiblioteca();
  const peliculaBib = obtener(movieId);

  const [accionBib, setAccionBib] = useState(false); // Bloqueo mientras se escribe
  const [error, setError] = useState<string | null>(null);

  const datosPelicula = (): DatosPeliculaBiblioteca | null =>
    detalles
      ? {
          idPelicula: movieId,
          titulo: detalles.title,
          rutaPoster: detalles.poster_path,
          fechaLanzamiento: detalles.release_date || undefined,
          providers: {
            flatrate: providers?.flatrate?.map((p) => p.provider_id) ?? [],
            rent: [...(providers?.rent ?? []), ...(providers?.buy ?? [])].map((p) => p.provider_id),
          },
        }
      : null;

  const ejecutar = async (accion: () => Promise<void>, mensajeError: string) => {
    if (!user) return;
    setAccionBib(true);
    setError(null);
    try {
      await accion();
    } catch {
      setError(mensajeError);
    } finally {
      setAccionBib(false);
    }
  };

  /** Por ver: si ya está en Por ver la quita; si no, la pone (si estaba vista, deja de estarlo). */
  const onPorVer = () =>
    ejecutar(async () => {
      if (peliculaBib?.estado === 'por_ver') {
        await eliminarPelicula(movieId);
        return;
      }
      const datos = datosPelicula();
      if (datos) await guardarEnPorVer(datos);
    }, 'No hemos podido guardar la peli. Revisa la conexión.');

  /**
   * Marca la peli como vista con su valoración (0 = sin valorar).
   * Si ya estaba vista, solo cambia la valoración: nunca la borra ni le cambia la fecha.
   */
  const onMarcarVista = (valoracion: number, fechaVisto?: number) =>
    ejecutar(async () => {
      const datos = datosPelicula();
      if (datos) await marcarComoVista(datos, peliculaBib, valoracion, fechaVisto);
    }, 'No hemos podido guardar la peli. Revisa la conexión.');

  /** Cambia solo la valoración de una peli ya vista. */
  const onActualizarValoracion = (valoracion: number) =>
    ejecutar(() => actualizarValoracion(movieId, valoracion), 'No hemos podido guardar la nota.');

  /** Cambia la fecha en que se vio. */
  const onCambiarFechaVisto = (fecha: number) =>
    ejecutar(() => actualizarFechaVisto(movieId, fecha), 'No hemos podido cambiar la fecha.');

  /** Quita la peli de la biblioteca (Por ver o Vistas). Solo con una acción explícita. */
  const onQuitar = () =>
    ejecutar(() => eliminarPelicula(movieId), 'No hemos podido quitar la peli.');

  return {
    peliculaBib,
    bibCargando: cargando,
    accionBib,
    userError: error,
    onPorVer,
    onMarcarVista,
    onActualizarValoracion,
    onCambiarFechaVisto,
    onQuitar,
  };
}

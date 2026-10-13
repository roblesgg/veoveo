import { useCallback, useEffect, useState } from 'react';
import { tmdbApi } from '../../services/tmdbClient';
import type {
  CastMember,
  CollectionDetails,
  MovieDetails,
  WatchProvidersResponse,
} from '../../types';

export function useMovieData(movieId: number) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detalles, setDetalles] = useState<MovieDetails | null>(null);
  const [reparto, setReparto] = useState<CastMember[]>([]);
  const [providers, setProviders] = useState<WatchProvidersResponse | null>(null);
  const [coleccion, setColeccion] = useState<CollectionDetails | null>(null);
  const [intento, setIntento] = useState(0); // Se incrementa para volver a cargar

  useEffect(() => {
    let alive = true;

    setCargando(true);
    setError(null);
    setDetalles(null);
    setReparto([]);
    setProviders(null);
    setColeccion(null);

    (async () => {
      try {
        const detailsPromise = tmdbApi.obtenerDetallesPelicula(movieId);
        const creditsPromise = tmdbApi.obtenerCreditosPelicula(movieId);
        const providersPromise = tmdbApi.obtenerDondeVerConCache(movieId);
        const d = await detailsPromise;

        if (!alive) return;

        setDetalles(d);
        setCargando(false);

        creditsPromise
          .then((c) => {
            if (!alive) return;
            setReparto(c.cast.slice(0, 12));
          })
          .catch(() => {
            if (!alive) return;
            setReparto([]);
          });

        providersPromise
          .then((p) => {
            if (!alive) return;
            setProviders(p);
          })
          .catch(() => {
            if (!alive) return;
            setProviders(null);
          });

        if (d.belongs_to_collection) {
          tmdbApi
            .obtenerColeccion(d.belongs_to_collection.id)
            .then((col) => {
              if (alive) setColeccion(col);
            })
            .catch(() => {
              if (alive) setColeccion(null);
            });
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Error al cargar datos de TMDb');
        setCargando(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [movieId, intento]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  return { cargando, error, detalles, reparto, providers, coleccion, recargar };
}

import { useCallback, useEffect, useState } from 'react';
import { tmdbApi } from '../../services/tmdbClient';
import type { ActorDetails, ActorMovie } from '../../types';

export function useActorData(actorId: number) {
  const [detalles, setDetalles] = useState<ActorDetails | null>(null);
  const [peliculas, setPeliculas] = useState<ActorMovie[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0); // Se incrementa para volver a cargar

  useEffect(() => {
    let mounted = true;
    setCargando(true);
    setError(null);
    void (async () => {
      try {
        const [d, c] = await Promise.all([
          tmdbApi.obtenerDetallesActor(actorId),
          tmdbApi.obtenerPeliculasActor(actorId),
        ]);
        if (mounted) {
          setDetalles(d);
          setPeliculas(c.cast);
        }
      } catch (err) {
        if (mounted) setError('Error al cargar datos del actor');
      } finally {
        if (mounted) setCargando(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [actorId, intento]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  return { detalles, peliculas, cargando, error, recargar };
}

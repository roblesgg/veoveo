/**
 * ARCHIVO: hooks/useDiscoverSearch.ts
 * DESCRIPCIÓN: Hook para la gestión de búsqueda global en la pestaña Descubrir.
 * Implementa debouncing de 500ms y enriquecimiento dinámico de datos (streaming providers)
 * para los resultados de búsqueda de películas. Soporta búsqueda de actores.
 */

import { useState, useEffect } from 'react';
import { tmdbApi } from '../services/tmdbClient';
import type { Movie } from '../types';

export function useDiscoverSearch() {
  const [textoBuscar, setTextoBuscar] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(false);
  const [buscado, setBuscado] = useState(''); // Texto de la última búsqueda terminada
  const [intento, setIntento] = useState(0); // Se incrementa para repetir la búsqueda
  const [tipoBusqueda, setTipoBusqueda] = useState<'movie' | 'person'>('movie');

  useEffect(() => {
    // Evitamos búsquedas con menos de 3 caracteres
    if (textoBuscar.length < 3) {
      setResultadosBusqueda([]);
      setError(false);
      return;
    }

    /** ⏱️ LÓGICA DE DEBOUNCING:
     * Retardamos la ejecución de la búsqueda para no saturar la API
     * mientras el usuario escribe rápidamente.
     */
    const timer = setTimeout(async () => {
      setBuscando(true);
      setError(false);
      try {
        if (tipoBusqueda === 'movie') {
          // 🎬 BÚSQUEDA DE PELÍCULAS
          const res = await tmdbApi.buscarPeliculas(textoBuscar, 'es-ES');

          /** Enriquecimiento: Para cada resultado de búsqueda, consultamos
           * sus plataformas de streaming para mostrar los iconos de una vez.
           */
          const moviesWithProviders = await Promise.all(
            res.results.map(async (movie: Movie) => {
              try {
                const providersRes = await tmdbApi.obtenerDondeVer(movie.id);
                const resES = providersRes.results['ES'];
                const flatrate = resES?.flatrate?.map((p) => p.provider_id) || [];
                const rent = [...(resES?.rent || []), ...(resES?.buy || [])].map(
                  (p) => p.provider_id,
                );
                return { ...movie, providers: { flatrate, rent } };
              } catch {
                return movie; // Fallback si falla la carga de proveedores
              }
            }),
          );
          setResultadosBusqueda(moviesWithProviders);
        } else {
          // 👤 BÚSQUEDA DE ACTORES
          const res = await tmdbApi.buscarActores(textoBuscar, 'es-ES');
          setResultadosBusqueda(res.results);
        }
      } catch {
        setResultadosBusqueda([]);
        setError(true);
      } finally {
        setBuscado(textoBuscar);
        setBuscando(false);
      }
    }, 500);

    return () => clearTimeout(timer); // Limpieza del timer si el efecto se vuelve a disparar
  }, [textoBuscar, tipoBusqueda, intento]);

  const reintentar = () => setIntento((n) => n + 1);

  return {
    textoBuscar,
    setTextoBuscar,
    resultadosBusqueda,
    buscando,
    error,
    reintentar,
    sinResultados:
      buscado === textoBuscar && textoBuscar.length >= 3 && resultadosBusqueda.length === 0,
    tipoBusqueda,
    setTipoBusqueda,
  };
}

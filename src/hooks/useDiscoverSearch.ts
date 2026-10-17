/**
 * ARCHIVO: hooks/useDiscoverSearch.ts
 * DESCRIPCIÓN: Hook para la gestión de búsqueda global en la pestaña Descubrir.
 * Implementa debouncing de 500ms y enriquecimiento dinámico de datos (streaming providers)
 * para los resultados de búsqueda de películas. Soporta búsqueda de actores.
 */

import { useState, useEffect } from 'react';
import { tmdbApi } from '../services/tmdbClient';
import type { Movie } from '../types';
import { corregir } from '../utils/busquedaLista';
import { apuntarTitulos, vocabularioTitulos } from '../services/vocabularioTitulos';

export function useDiscoverSearch() {
  const [textoBuscar, setTextoBuscar] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(false);
  const [corregido, setCorregido] = useState<string | null>(null);
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
      setCorregido(null);
      try {
        if (tipoBusqueda === 'movie') {
          // 🎬 BÚSQUEDA DE PELÍCULAS
          let res = await tmdbApi.buscarPeliculas(textoBuscar, 'es-ES');
          // Si no hay nada, se corrigen las faltas con los títulos ya vistos y se reintenta:
          // «forest gamp» → «forrest gump»
          if (res.results.length === 0) {
            const arreglado = corregir(textoBuscar, vocabularioTitulos());
            if (arreglado) {
              const otra = await tmdbApi.buscarPeliculas(arreglado, 'es-ES');
              if (otra.results.length > 0) {
                res = otra;
                setCorregido(arreglado);
              }
            }
          }
          apuntarTitulos(res.results.map((m: Movie) => m.title));

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
          // 👤 BÚSQUEDA DE ACTORES (también perdona faltas en el nombre)
          let res = await tmdbApi.buscarActores(textoBuscar, 'es-ES');
          if (res.results.length === 0) {
            const arreglado = corregir(textoBuscar, vocabularioTitulos());
            if (arreglado) {
              const otra = await tmdbApi.buscarActores(arreglado, 'es-ES');
              if (otra.results.length > 0) {
                res = otra;
                setCorregido(arreglado);
              }
            }
          }
          apuntarTitulos(res.results.map((p: { name?: string }) => p.name));
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
    /** Si la búsqueda se arregló sola: el texto que se buscó de verdad */
    corregido,
    sinResultados:
      buscado === textoBuscar && textoBuscar.length >= 3 && resultadosBusqueda.length === 0,
    tipoBusqueda,
    setTipoBusqueda,
  };
}

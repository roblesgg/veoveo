/**
 * ARCHIVO: hooks/usePlataformasRegion.ts
 * DESCRIPCIÓN: Plataformas de streaming disponibles en España, agrupadas por marca
 * (Netflix, Prime Video…). Las usan Ajustes y el filtro de la Biblioteca.
 * Cambian poco: se guardan una semana en el móvil.
 */

import { useQuery } from '@tanstack/react-query';
import { tmdbApi } from '../services/tmdbClient';

export type GrupoPlataforma = { ids: number[]; name: string; logo: string; searchTerms: string };

const UNA_SEMANA = 1000 * 60 * 60 * 24 * 7;

/** Agrupa las variantes de una misma plataforma (por ejemplo, "Amazon Prime Video with Ads"). */
export function agruparPlataformas(lista: { provider_id: number; provider_name: string; logo_path: string }[]): GrupoPlataforma[] {
  const grupos: Record<string, GrupoPlataforma> = {};
  lista.forEach((p) => {
    let name = p.provider_name;
    let alias = name.toLowerCase();
    if (name.includes('Amazon') || name.includes('Prime Video')) { name = 'Prime Video'; alias += ' amazon prime amz'; }
    else if (name.includes('Apple TV')) { name = 'Apple TV+'; alias += ' itunes apple+'; }
    else if (name.includes('Disney')) { name = 'Disney+'; alias += ' dsn disneyplus'; }
    else if (name.includes('HBO')) { name = 'HBO Max'; alias += ' hbomax max'; }
    else if (name.includes('Netflix')) { name = 'Netflix'; alias += ' nflx netf'; }
    else if (name.includes('SkyShowtime')) { name = 'SkyShowtime'; alias += ' sky showtime'; }
    else if (name.includes('Movistar')) { name = 'Movistar Plus+'; alias += ' m+ movstar movistar+'; }

    if (!grupos[name]) grupos[name] = { ids: [], name, logo: p.logo_path, searchTerms: alias };
    grupos[name].ids.push(p.provider_id);
    grupos[name].searchTerms += ` ${alias}`;
  });
  return Object.values(grupos).sort((a, b) => a.name.localeCompare(b.name));
}

export function usePlataformasRegion() {
  return useQuery({
    queryKey: ['plataformas-region', 'ES'],
    queryFn: async () => agruparPlataformas((await tmdbApi.obtenerProveedoresRegion('ES')).results),
    staleTime: UNA_SEMANA,
    gcTime: UNA_SEMANA,
    meta: { persistir: true },
  });
}

/**
 * ARCHIVO: services/recomendaciones.ts
 * DESCRIPCIÓN: "Recomendado para ti". Algoritmo explicado en docs/recomendaciones.md.
 *
 * 1. Semillas: tus vistas con 4-5 estrellas (o 3 si no hay más), las más recientes primero,
 *    rotando cada día cuáles se usan para no repetir siempre lo mismo.
 * 2. Candidatas: recomendaciones de TMDB de cada semilla, más pelis del director y del actor
 *    que más se repiten en tus favoritas.
 * 3. Amigos: suma puntos lo que a tus amigos les ha encantado (4-5 estrellas).
 * 4. Géneros: un pequeño extra si coincide con los géneros de tus favoritas.
 * 5. Fuera: todo lo que ya tienes en tu biblioteca (vistas y por ver).
 * Cada recomendación dice por qué: "Porque te gustó Dune", "A 3 amigos les encanta".
 */

import { tmdbApi } from './tmdbClient';
import type { FavoritaDeAmigos } from './repositorioSocial';
import type { Movie, PeliculaUsuario } from '../types';

export type PeliculaRecomendada = Movie & { motivo: string };

type Candidata = {
  pelicula: Movie;
  puntos: number;
  motivo: string;
  pesoMotivo: number;
};

const MAX_SEMILLAS = 4;
const MAX_RESULTADOS = 30;
const MAX_POR_SEMILLA = 8;

/** Número del día (cambia a medianoche): sirve para rotar semillas y variar el orden. */
export function claveDelDia(fecha = new Date()): number {
  return Math.floor(fecha.getTime() / (24 * 60 * 60 * 1000));
}

/** Pseudoaleatorio estable para un id y un día (mismo resultado durante todo el día). */
function ruido(id: number, dia: number): number {
  const x = Math.sin(id * 12.9898 + dia * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Elige las semillas: mejor valoradas y más recientes, rotando cada día entre las 8 primeras. */
export function elegirSemillas(vistas: PeliculaUsuario[], dia: number): PeliculaUsuario[] {
  const fecha = (p: PeliculaUsuario) => p.fechaVisto ?? p.fechaAnadido;
  let favoritas = vistas.filter((p) => p.valoracion >= 4);
  if (favoritas.length < 2) favoritas = vistas.filter((p) => p.valoracion >= 3);
  const ordenadas = [...favoritas].sort((a, b) => b.valoracion - a.valoracion || fecha(b) - fecha(a));
  const grupo = ordenadas.slice(0, 8);
  if (grupo.length <= MAX_SEMILLAS) return grupo;
  const inicio = dia % grupo.length;
  return Array.from({ length: MAX_SEMILLAS }, (_, i) => grupo[(inicio + i) % grupo.length]);
}

function pesoPorNota(valoracion: number): number {
  if (valoracion >= 5) return 1;
  if (valoracion >= 4) return 0.75;
  return 0.4;
}

/** Calcula las recomendaciones. Unas 12 llamadas a TMDB; el resultado se guarda en caché. */
export async function calcularRecomendaciones(
  vistas: PeliculaUsuario[],
  porVer: PeliculaUsuario[],
  favoritasAmigos: FavoritaDeAmigos[],
  dia = claveDelDia(),
): Promise<PeliculaRecomendada[]> {
  const enBiblioteca = new Set([...vistas, ...porVer].map((p) => p.idPelicula));
  const semillas = elegirSemillas(vistas, dia);
  const candidatas = new Map<number, Candidata>();

  const sumar = (pelicula: Movie, puntos: number, motivo: string) => {
    if (enBiblioteca.has(pelicula.id) || !pelicula.poster_path) return;
    const actual = candidatas.get(pelicula.id);
    if (!actual) {
      candidatas.set(pelicula.id, { pelicula, puntos, motivo, pesoMotivo: puntos });
      return;
    }
    actual.puntos += puntos;
    // El motivo que se enseña es el que más ha aportado
    if (puntos > actual.pesoMotivo) {
      actual.motivo = motivo;
      actual.pesoMotivo = puntos;
    }
  };

  // 1-2. Recomendaciones de TMDB de cada semilla (si no hay, "similares")
  const [listas, detallesSemillas, creditosSemillas] = await Promise.all([
    Promise.all(
      semillas.map(async (s) => {
        try {
          const rec = await tmdbApi.obtenerRecomendaciones(s.idPelicula);
          if (rec.results.length > 0) return rec.results;
          return (await tmdbApi.obtenerSimilares(s.idPelicula)).results;
        } catch {
          return [];
        }
      }),
    ),
    Promise.all(semillas.map((s) => tmdbApi.obtenerDetallesPelicula(s.idPelicula).catch(() => null))),
    Promise.all(semillas.map((s) => tmdbApi.obtenerCreditosPelicula(s.idPelicula).catch(() => null))),
  ]);

  semillas.forEach((semilla, i) => {
    const peso = pesoPorNota(semilla.valoracion);
    listas[i].slice(0, MAX_POR_SEMILLA * 2).forEach((pelicula, posicion) => {
      sumar(pelicula, peso * (1 - posicion / 40), `Porque te gustó ${semilla.titulo}`);
    });
  });

  // 2b. Director y actor que más se repiten en tus favoritas
  const contar = (nombres: { id: number; name: string }[]) => {
    const cuenta = new Map<number, { name: string; veces: number }>();
    nombres.forEach(({ id, name }) => {
      const actual = cuenta.get(id) ?? { name, veces: 0 };
      actual.veces += 1;
      cuenta.set(id, actual);
    });
    return [...cuenta.entries()].sort((a, b) => b[1].veces - a[1].veces)[0];
  };
  const director = contar(
    creditosSemillas.flatMap((c) => c?.crew.filter((p) => p.job === 'Director') ?? []),
  );
  const actor = contar(
    creditosSemillas.flatMap((c) => c?.cast.filter((p) => p.order < 3) ?? []),
  );
  const [pelisDirector, pelisActor] = await Promise.all([
    director
      ? tmdbApi
          .listaPeliculas('discover/movie', { with_crew: String(director[0]), sort_by: 'vote_average.desc', 'vote_count.gte': '100' })
          .catch(() => null)
      : null,
    actor
      ? tmdbApi
          .listaPeliculas('discover/movie', { with_cast: String(actor[0]), sort_by: 'popularity.desc', 'vote_count.gte': '100' })
          .catch(() => null)
      : null,
  ]);
  pelisDirector?.results.slice(0, 10).forEach((p) => sumar(p, 0.6, `Porque te gusta ${director![1].name}`));
  pelisActor?.results.slice(0, 10).forEach((p) => sumar(p, 0.45, `Porque te gusta ${actor![1].name}`));

  // 3. Lo que les encanta a tus amigos
  favoritasAmigos.forEach((f) => {
    const n = f.amigos.length;
    const motivo = n > 1 ? `A ${n} amigos les encanta` : `A ${f.amigos[0]} le encantó`;
    const existente = candidatas.get(f.idPelicula);
    const pelicula: Movie = existente?.pelicula ?? {
      id: f.idPelicula,
      title: f.titulo,
      overview: '',
      poster_path: f.rutaPoster,
      release_date: null,
      vote_average: 0,
    };
    sumar(pelicula, 0.5 + 0.35 * Math.min(n, 4), motivo);
  });

  // 4. Afinidad de géneros con tus favoritas
  const generosFavoritos = new Set(detallesSemillas.flatMap((d) => d?.genres.map((g) => g.id) ?? []));
  candidatas.forEach((c) => {
    const coincidencias = (c.pelicula.genre_ids ?? []).filter((g) => generosFavoritos.has(g)).length;
    c.puntos += 0.1 * Math.min(coincidencias, 3);
    // Variedad: un poco de ruido estable durante el día
    c.puntos += 0.15 * ruido(c.pelicula.id, dia);
  });

  // 5. Orden final, sin que un mismo motivo acapare la lista
  const porMotivo = new Map<string, number>();
  return [...candidatas.values()]
    .sort((a, b) => b.puntos - a.puntos)
    .filter((c) => {
      const usados = porMotivo.get(c.motivo) ?? 0;
      porMotivo.set(c.motivo, usados + 1);
      return usados < MAX_POR_SEMILLA;
    })
    .slice(0, MAX_RESULTADOS)
    .map((c) => ({ ...c.pelicula, motivo: c.motivo }));
}

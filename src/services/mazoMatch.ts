/**
 * ARCHIVO: services/mazoMatch.ts
 * DESCRIPCIÓN: Genera el mazo del Movie Match. Lo llama SOLO quien crea el Match, una vez;
 * el mazo se guarda en el documento y los demás solo lo leen (todos ven las mismas cartas).
 *
 * Orden del mazo:
 * 1. Lo que está en el Por ver de varios participantes (lo más probable que coincida).
 * 2. Intercaladas: el Por ver de cada uno, recomendaciones para el grupo y las Vistas de
 *    quien lo permite en su privacidad (`vistasEnMatch`).
 * 3. Si no llega, tendencias y populares de relleno.
 * La biblioteca de quien no la comparte (o no es amigo de quien crea) simplemente no entra.
 */

import { collection, getDocs } from 'firebase/firestore';
import type { CartaMazo, Movie, PeliculaUsuario } from '../types';
import { dbOrThrow } from './firebase';
import { obtenerPerfilUsuarioPorUid } from './repositorioUsuarios';
import { tmdbApi } from './tmdbClient';

export const TAMANO_MAZO = 60;
const MAX_SEMILLAS = 4;

type Biblioteca = { uid: string; porVer: PeliculaUsuario[]; vistas: PeliculaUsuario[] };

function barajar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

const anio = (fecha?: string | null) => (fecha ? fecha.slice(0, 4) : undefined);

/** Lee lo que se puede de la biblioteca de cada participante (las reglas deciden). */
async function leerBibliotecas(participantes: string[]): Promise<Biblioteca[]> {
  return Promise.all(
    participantes.map(async (uid) => {
      try {
        const [snap, perfil] = await Promise.all([
          getDocs(collection(dbOrThrow(), 'usuarios', uid, 'peliculas')),
          obtenerPerfilUsuarioPorUid(uid),
        ]);
        const pelis = snap.docs.map((d) => d.data() as PeliculaUsuario);
        const vistasPermitidas = perfil?.privacidad?.vistasEnMatch !== false;
        return {
          uid,
          porVer: pelis.filter((p) => p.estado === 'por_ver'),
          vistas: vistasPermitidas ? pelis.filter((p) => p.estado === 'vista') : [],
        };
      } catch {
        return { uid, porVer: [], vistas: [] };
      }
    }),
  );
}

/** Recomendaciones para el grupo: semillas = las mejor valoradas, una de cada participante por turnos. */
async function recomendarAlGrupo(bibliotecas: Biblioteca[]): Promise<Movie[]> {
  const favoritas = bibliotecas.map((b) =>
    [...b.vistas].filter((p) => p.valoracion >= 4).sort((x, y) => y.valoracion - x.valoracion),
  );
  const semillas: PeliculaUsuario[] = [];
  for (
    let ronda = 0;
    semillas.length < MAX_SEMILLAS && favoritas.some((f) => f.length > ronda);
    ronda++
  ) {
    favoritas.forEach((f) => {
      if (f[ronda] && semillas.length < MAX_SEMILLAS) semillas.push(f[ronda]);
    });
  }
  const listas = await Promise.all(
    semillas.map((s) =>
      tmdbApi
        .obtenerRecomendaciones(s.idPelicula)
        .then((r) => r.results.slice(0, 12))
        .catch(() => [] as Movie[]),
    ),
  );
  // Intercaladas: la 1.ª de cada semilla, luego la 2.ª…
  const resultado: Movie[] = [];
  for (let i = 0; i < 12; i++) listas.forEach((l) => l[i] && resultado.push(l[i]));
  return resultado;
}

async function relleno(): Promise<Movie[]> {
  const [tendencias, populares] = await Promise.all([
    tmdbApi.obtenerTendencias('es-ES', 'week').catch(() => null),
    tmdbApi.obtenerPopulares('es-ES', 1 + Math.floor(Math.random() * 5)).catch(() => null),
  ]);
  return barajar([...(tendencias?.results ?? []), ...(populares?.results ?? [])]);
}

/**
 * Ordena las fuentes en un mazo. Pura (salvo el barajado) para poder razonarla y probarla.
 */
export function componerMazo(
  bibliotecas: Biblioteca[],
  recomendadas: Movie[],
  extra: Movie[],
  tamano = TAMANO_MAZO,
): CartaMazo[] {
  const cartas = new Map<number, CartaMazo>();
  const anotar = (p: PeliculaUsuario, uid: string, campo: 'pv' | 'v') => {
    const c = cartas.get(p.idPelicula) ?? {
      id: p.idPelicula,
      t: p.titulo,
      p: p.rutaPoster,
      ...(anio(p.fechaLanzamiento) ? { a: anio(p.fechaLanzamiento) } : {}),
    };
    c[campo] = [...new Set([...(c[campo] ?? []), uid])];
    cartas.set(p.idPelicula, c);
  };
  bibliotecas.forEach((b) => {
    b.porVer.forEach((p) => anotar(p, b.uid, 'pv'));
    b.vistas.forEach((p) => anotar(p, b.uid, 'v'));
  });
  const desdeTmdb = (m: Movie, recomendada: boolean): CartaMazo => ({
    id: m.id,
    t: m.title,
    p: m.poster_path,
    ...(anio(m.release_date) ? { a: anio(m.release_date) } : {}),
    ...(recomendada ? { r: 1 as const } : {}),
  });

  const mazo: CartaMazo[] = [];
  const usadas = new Set<number>();
  const meter = (c: CartaMazo | undefined) => {
    if (!c || usadas.has(c.id) || !c.p || mazo.length >= tamano) return;
    usadas.add(c.id);
    mazo.push(c);
  };

  // 1. En el Por ver de varios
  barajar([...cartas.values()].filter((c) => (c.pv?.length ?? 0) >= 2)).forEach(meter);

  // 2. Intercaladas por turnos
  const colas: CartaMazo[][] = [
    ...bibliotecas.map((b) => barajar(b.porVer.map((p) => cartas.get(p.idPelicula)!))),
    recomendadas.map((m) => cartas.get(m.id) ?? desdeTmdb(m, true)),
    ...bibliotecas.map((b) => barajar(b.vistas.map((p) => cartas.get(p.idPelicula)!))),
  ];
  for (let i = 0; mazo.length < tamano && colas.some((c) => c.length > i); i++) {
    colas.forEach((c) => meter(c[i]));
  }

  // 3. Relleno
  extra.forEach((m) => meter(desdeTmdb(m, false)));
  return mazo;
}

/** Genera el mazo de un Match nuevo. Unas 6 llamadas a TMDB como mucho. */
export async function generarMazo(participantes: string[]): Promise<CartaMazo[]> {
  const bibliotecas = await leerBibliotecas(participantes);
  const recomendadas = await recomendarAlGrupo(bibliotecas);
  const parcial = componerMazo(bibliotecas, recomendadas, []);
  if (parcial.length >= TAMANO_MAZO) return parcial;
  return componerMazo(bibliotecas, recomendadas, await relleno());
}

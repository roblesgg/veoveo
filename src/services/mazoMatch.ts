/**
 * ARCHIVO: services/mazoMatch.ts
 * DESCRIPCIÓN: Genera el mazo del Movie Match. Lo llama SOLO quien crea el Match, una vez;
 * el mazo se guarda en el documento y los demás solo lo leen (todos ven las mismas cartas).
 *
 * Orden del mazo:
 * 1. Lo que está en el Por ver de varios participantes (lo más probable que coincida).
 * 2. El Por ver de cada uno, intercalado entre participantes (hasta el 75 % del mazo).
 * 3. Por turnos: recomendaciones para el grupo y las Vistas de quien lo permite en su privacidad
 *    (`vistasEnMatch`).
 * 4. Si no llega, tendencias y populares de relleno.
 * La biblioteca de quien no la comparte (o no es amigo de quien crea) simplemente no entra.
 */

import { collection, getDocs } from 'firebase/firestore';
import type { CartaMazo, Movie, PeliculaUsuario } from '../types';
import { dbOrThrow } from './firebase';
import { obtenerPerfilUsuarioPorUid } from './repositorioUsuarios';
import { obtenerFavoritasDeAmigos } from './repositorioSocial';
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
  /** Favoritas de los amigos de quien crea (fuente social) */
  deAmigos: CartaMazo[] = [],
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

  // 2. El Por ver de cada uno, intercalado entre participantes, ANTES que nada más: es lo que
  //    de verdad quieren ver (Álvaro, 14-10). Hasta el 75 % del mazo, para que siempre quede
  //    sitio para alguna recomendación.
  const topePorVer = Math.round(tamano * 0.75);
  const colasPorVer = bibliotecas.map((b) =>
    barajar(b.porVer.map((p) => cartas.get(p.idPelicula)!)),
  );
  for (let i = 0; mazo.length < topePorVer && colasPorVer.some((c) => c.length > i); i++) {
    colasPorVer.forEach((c) => mazo.length < topePorVer && meter(c[i]));
  }

  // 3. Luego, por turnos: recomendaciones para el grupo, las Vistas permitidas y lo que quede
  //    del Por ver; también lo que les encanta a los amigos
  const colas: CartaMazo[][] = [
    recomendadas.map((m) => cartas.get(m.id) ?? desdeTmdb(m, true)),
    deAmigos.map((c) => cartas.get(c.id) ?? c),
    ...bibliotecas.map((b) => barajar(b.vistas.map((p) => cartas.get(p.idPelicula)!))),
    ...colasPorVer,
  ];
  for (let i = 0; mazo.length < tamano && colas.some((c) => c.length > i); i++) {
    colas.forEach((c) => meter(c[i]));
  }

  // 4. Relleno (tendencias y populares) solo si no llega
  extra.forEach((m) => meter(desdeTmdb(m, false)));
  return mazo;
}

/** Lo que les encanta a los amigos de quien crea (las mismas que «A tus amigos les encanta»). */
async function favoritasDeLosAmigos(): Promise<CartaMazo[]> {
  try {
    const favoritas = await obtenerFavoritasDeAmigos();
    return barajar(favoritas).map((f) => ({
      id: f.idPelicula,
      t: f.titulo,
      p: f.rutaPoster,
      s: 1 as const,
    }));
  } catch {
    return [];
  }
}

/** Por debajo de esto, con filtro de plataformas, se avisa antes de jugar. */
export const MINIMO_MAZO = 15;
const CANDIDATAS_CON_FILTRO = 160;
const LOTE_DONDE_VER = 10;

/** Plataformas (de suscripción, en España) donde se puede ver una peli. */
async function plataformasDe(id: number): Promise<number[]> {
  try {
    const r = await tmdbApi.obtenerDondeVerConCache(id);
    return (r.results?.ES?.flatrate ?? []).map((p) => p.provider_id);
  } catch {
    return [];
  }
}

/** Relleno ya filtrado por plataformas (discover filtra en la misma llamada). */
async function rellenoEnPlataformas(plataformas: number[]): Promise<Movie[]> {
  const filtros = `with_watch_providers=${plataformas.join('|')}&watch_region=ES&watch_monetization_types=flatrate&sort_by=popularity.desc`;
  const paginas = await Promise.all(
    [1, 2].map((p) => tmdbApi.descubrirPeliculas(filtros, 'es-ES', p).catch(() => null)),
  );
  return barajar(paginas.flatMap((p) => p?.results ?? []));
}

/**
 * Genera el mazo de un Match nuevo. Sin filtro, unas 6 llamadas a TMDB como mucho.
 * Con `plataformas`, solo entran pelis que se puedan ver en alguna de ellas: las de las
 * bibliotecas usan las plataformas que ya tienen guardadas y solo se pregunta a TMDB por las que
 * no (en lotes, con caché, hasta llenar el mazo); el relleno sale de discover ya filtrado.
 */
export async function generarMazo(
  participantes: string[],
  plataformas?: number[] | null,
  opciones?: { incluirVistas?: boolean },
): Promise<CartaMazo[]> {
  const bibliotecas = await leerBibliotecas(participantes);
  // Las recomendaciones salen de las vistas mejor valoradas: se calculan antes de quitarlas
  const recomendadasTodas = await recomendarAlGrupo(bibliotecas);

  // «Solo pelis que no haya visto nadie»: fuera las vistas y todo lo que alguien ya vio. Solo
  // cuentan las vistas que cada uno permite (vistasEnMatch): el interruptor del grupo quita,
  // nunca expone. Una peli vista por quien las tiene en privado puede colarse (no se señala a nadie).
  const incluirVistas = opciones?.incluirVistas ?? true;
  const vistasDeAlguien = new Set(bibliotecas.flatMap((b) => b.vistas.map((p) => p.idPelicula)));
  const vale = (id: number) => incluirVistas || !vistasDeAlguien.has(id);
  if (!incluirVistas) {
    bibliotecas.forEach((b) => {
      b.vistas = [];
      b.porVer = b.porVer.filter((p) => vale(p.idPelicula));
    });
  }
  const recomendadas = recomendadasTodas.filter((m) => vale(m.id));
  const deAmigos = (await favoritasDeLosAmigos()).filter((c) => vale(c.id));

  if (!plataformas?.length) {
    const parcial = componerMazo(bibliotecas, recomendadas, [], TAMANO_MAZO, deAmigos);
    if (parcial.length >= TAMANO_MAZO) return parcial;
    const extra = (await relleno()).filter((m) => vale(m.id));
    return componerMazo(bibliotecas, recomendadas, extra, TAMANO_MAZO, deAmigos);
  }

  const elegidas = new Set(plataformas);
  const guardadas = new Map<number, number[]>();
  bibliotecas.forEach((b) =>
    [...b.porVer, ...b.vistas].forEach((p) => {
      if (p.providers?.flatrate) guardadas.set(p.idPelicula, p.providers.flatrate);
    }),
  );
  const candidatas = componerMazo(bibliotecas, recomendadas, [], CANDIDATAS_CON_FILTRO, deAmigos);
  const mazo: CartaMazo[] = [];
  for (let i = 0; i < candidatas.length && mazo.length < TAMANO_MAZO; i += LOTE_DONDE_VER) {
    const lote = candidatas.slice(i, i + LOTE_DONDE_VER);
    const donde = await Promise.all(
      lote.map((c) => (guardadas.has(c.id) ? guardadas.get(c.id)! : plataformasDe(c.id))),
    );
    lote.forEach((c, j) => {
      if (mazo.length < TAMANO_MAZO && donde[j].some((id) => elegidas.has(id))) mazo.push(c);
    });
  }
  if (mazo.length >= TAMANO_MAZO) return mazo;

  const usadas = new Set(mazo.map((c) => c.id));
  for (const m of await rellenoEnPlataformas(plataformas)) {
    if (mazo.length >= TAMANO_MAZO) break;
    if (usadas.has(m.id) || !m.poster_path || !vale(m.id)) continue;
    usadas.add(m.id);
    mazo.push({
      id: m.id,
      t: m.title,
      p: m.poster_path,
      ...(anio(m.release_date) ? { a: anio(m.release_date) } : {}),
    });
  }
  return mazo;
}

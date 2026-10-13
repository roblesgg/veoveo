/**
 * ARCHIVO: services/muroAmigos.ts
 * DESCRIPCIÓN: El muro de Social: qué han visto, qué les ha encantado y qué tienen en Por ver
 * tus amigos. Respeta la privacidad: la biblioteca de quien no la comparte no se puede leer
 * (reglas) y las Vistas de quien no quiere enseñarlas en Social no se usan (app).
 *
 * Coste acotado para el plan gratuito: hasta 15 amigos y, de cada uno, 15 vistas recientes,
 * 15 favoritas y 25 añadidas recientes (≈ 55 lecturas por amigo; se guarda en caché).
 */
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import type { PeliculaUsuario, UsuarioPerfil } from '../types';
import { dbOrThrow } from './firebase';

const MAX_AMIGOS = 15;

export type PeliDeAmigos = {
  idPelicula: number;
  titulo: string;
  rutaPoster: string | null;
  amigos: string[]; // uids
  media?: number; // estrellas medias (favoritas)
  fecha: number; // la más reciente
};
export type VistaDeAmigo = { amigo: string; peli: PeliculaUsuario };

export type MuroAmigos = {
  vistasRecientes: VistaDeAmigo[];
  favoritas: PeliDeAmigos[];
  porVer: PeliDeAmigos[];
  conBibliotecaOculta: string[]; // amigos cuya biblioteca no se ha podido leer
};

async function leer(uid: string, q: ReturnType<typeof query>) {
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as PeliculaUsuario);
}

export async function cargarMuro(amigos: UsuarioPerfil[]): Promise<MuroAmigos> {
  const db = dbOrThrow();
  const elegidos = [...amigos]
    .sort((a, b) => (b.ultimoAcceso ?? 0) - (a.ultimoAcceso ?? 0))
    .slice(0, MAX_AMIGOS);
  const vistasRecientes: VistaDeAmigo[] = [];
  const favoritas = new Map<number, PeliDeAmigos & { suma: number }>();
  const porVer = new Map<number, PeliDeAmigos>();
  const conBibliotecaOculta: string[] = [];

  await Promise.all(
    elegidos.map(async (amigo) => {
      const pelis = collection(db, 'usuarios', amigo.uid, 'peliculas');
      const ensenaVistas = amigo.privacidad?.vistasEnSocial !== false;
      try {
        const [recientes, mejores, anadidas] = await Promise.all([
          ensenaVistas
            ? leer(amigo.uid, query(pelis, orderBy('fechaVisto', 'desc'), limit(15)))
            : [],
          ensenaVistas
            ? leer(amigo.uid, query(pelis, where('valoracion', '>=', 4), limit(15)))
            : [],
          leer(amigo.uid, query(pelis, orderBy('fechaAnadido', 'desc'), limit(25))),
        ]);
        recientes
          .filter((p) => p.estado === 'vista')
          .forEach((peli) => vistasRecientes.push({ amigo: amigo.uid, peli }));
        mejores
          .filter((p) => p.estado === 'vista')
          .forEach((p) => {
            const f = favoritas.get(p.idPelicula) ?? {
              idPelicula: p.idPelicula,
              titulo: p.titulo,
              rutaPoster: p.rutaPoster,
              amigos: [],
              suma: 0,
              fecha: 0,
            };
            f.amigos.push(amigo.uid);
            f.suma += p.valoracion;
            f.fecha = Math.max(f.fecha, p.fechaVisto ?? p.fechaAnadido);
            favoritas.set(p.idPelicula, f);
          });
        anadidas
          .filter((p) => p.estado === 'por_ver')
          .forEach((p) => {
            const e = porVer.get(p.idPelicula) ?? {
              idPelicula: p.idPelicula,
              titulo: p.titulo,
              rutaPoster: p.rutaPoster,
              amigos: [],
              fecha: 0,
            };
            e.amigos.push(amigo.uid);
            e.fecha = Math.max(e.fecha, p.fechaAnadido);
            porVer.set(p.idPelicula, e);
          });
      } catch {
        conBibliotecaOculta.push(amigo.uid);
      }
    }),
  );

  return {
    vistasRecientes: vistasRecientes
      .sort((a, b) => (b.peli.fechaVisto ?? 0) - (a.peli.fechaVisto ?? 0))
      .slice(0, 20),
    // Más amigos primero; a igualdad, mejor media
    favoritas: [...favoritas.values()]
      .map(({ suma, ...f }) => ({ ...f, media: suma / f.amigos.length }))
      .sort((a, b) => b.amigos.length - a.amigos.length || b.media - a.media || b.fecha - a.fecha)
      .slice(0, 20),
    porVer: [...porVer.values()]
      .sort((a, b) => b.amigos.length - a.amigos.length || b.fecha - a.fecha)
      .slice(0, 20),
    conBibliotecaOculta,
  };
}

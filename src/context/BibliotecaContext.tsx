/**
 * ARCHIVO: context/BibliotecaContext.tsx
 * DESCRIPCIÓN: Biblioteca del usuario (Por ver y Vistas) con una sola escucha de Firestore
 * para toda la sesión. Descubrir, Biblioteca y la ficha de cada peli leen de aquí,
 * en lugar de abrir cada una su propia escucha al montarse.
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { escucharBiblioteca } from '../services/repositorioPeliculasUsuario';
import type { PeliculaUsuario } from '../types';
import { useAuth } from './AuthContext';

export type EstadoEnBiblioteca = { estado: PeliculaUsuario['estado']; valoracion: number };

type BibliotecaValue = {
  porVer: PeliculaUsuario[];
  vistas: PeliculaUsuario[];
  /** Estado de cada peli por id de TMDB, para pintar los iconos de los pósters. */
  mapa: Record<number, EstadoEnBiblioteca>;
  obtener: (idPelicula: number) => PeliculaUsuario | null;
  cargando: boolean;
  error: string | null;
};

const BibliotecaContext = createContext<BibliotecaValue | null>(null);

export function BibliotecaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.emailVerified ? user.uid : null;
  const [peliculas, setPeliculas] = useState<PeliculaUsuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPeliculas([]);
    setError(null);
    if (!uid) {
      setCargando(false);
      return;
    }
    setCargando(true);
    return escucharBiblioteca(
      uid,
      (lista) => {
        setPeliculas(lista);
        setCargando(false);
      },
      () => {
        setError('No hemos podido cargar tu biblioteca. Revisa la conexión.');
        setCargando(false);
      },
    );
  }, [uid]);

  const value = useMemo<BibliotecaValue>(() => {
    const porId = new Map(peliculas.map((p) => [p.idPelicula, p]));
    const mapa: Record<number, EstadoEnBiblioteca> = {};
    peliculas.forEach((p) => {
      mapa[p.idPelicula] = { estado: p.estado, valoracion: p.valoracion || 0 };
    });
    return {
      porVer: peliculas.filter((p) => p.estado === 'por_ver'),
      vistas: peliculas.filter((p) => p.estado === 'vista'),
      mapa,
      obtener: (idPelicula) => porId.get(idPelicula) ?? null,
      cargando,
      error,
    };
  }, [peliculas, cargando, error]);

  return <BibliotecaContext.Provider value={value}>{children}</BibliotecaContext.Provider>;
}

export function useBiblioteca(): BibliotecaValue {
  const value = useContext(BibliotecaContext);
  if (!value) throw new Error('useBiblioteca debe usarse dentro de BibliotecaProvider');
  return value;
}

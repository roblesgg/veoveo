/**
 * Perfiles públicos de varias personas (nombre, foto, estado), con caché de TanStack Query.
 * Para las listas de chats, los miembros de un grupo y los remitentes de los mensajes.
 */
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { obtenerPerfilUsuarioPorUid } from '../services/repositorioUsuarios';
import type { UsuarioPerfil } from '../types';

const CINCO_MINUTOS = 1000 * 60 * 5;

export function usePerfiles(uids: string[]): Record<string, UsuarioPerfil | undefined> {
  const unicos = useMemo(() => [...new Set(uids)].sort(), [uids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const consultas = useQueries({
    queries: unicos.map((uid) => ({
      queryKey: ['perfil', uid],
      queryFn: () => obtenerPerfilUsuarioPorUid(uid),
      staleTime: CINCO_MINUTOS,
      meta: { persistir: true },
    })),
  });
  return useMemo(() => {
    const mapa: Record<string, UsuarioPerfil | undefined> = {};
    unicos.forEach((uid, i) => {
      mapa[uid] = consultas[i]?.data ?? undefined;
    });
    return mapa;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unicos, consultas.map((c) => c.dataUpdatedAt).join(',')]);
}

/** Nombre que se enseña de un usuario (o «Usuario eliminado» si ya no existe). */
export function nombreDe(perfil: UsuarioPerfil | undefined | null, cargando = false) {
  if (perfil?.username) return perfil.username;
  return cargando ? '…' : 'Usuario eliminado';
}

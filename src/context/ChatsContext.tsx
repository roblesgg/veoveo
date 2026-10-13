/**
 * ARCHIVO: context/ChatsContext.tsx
 * DESCRIPCIÓN: Mis chats y mi estado de cada uno (no leídos, ocultos) con una sola escucha
 * para toda la sesión. Lo usan la pestaña Chats y el contador de la barra.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  chatVisible,
  contarChatsNoLeidos,
  observarEstadoPropio,
  observarMisChats,
  tieneNoLeidos,
} from '../services/repositorioChats';
import type { Chat, EstadoChatPropio } from '../types';

type ChatsValue = {
  /** Chats visibles (sin los que he ocultado), del más reciente al más antiguo */
  chats: Chat[];
  estado: Record<string, EstadoChatPropio>;
  cargando: boolean;
  error: boolean;
  /** Número de chats con mensajes sin leer */
  noLeidos: number;
  conNoLeidos: (chat: Chat) => boolean;
};

const ChatsContext = createContext<ChatsValue | null>(null);

export function ChatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const yo = user?.emailVerified ? user.uid : null;
  const [todos, setTodos] = useState<Chat[]>([]);
  const [estado, setEstado] = useState<Record<string, EstadoChatPropio>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setTodos([]);
    setEstado({});
    if (!yo) {
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(false);
    const dejarChats = observarMisChats(
      yo,
      (lista) => {
        setTodos(lista);
        setCargando(false);
      },
      () => {
        setError(true);
        setCargando(false);
      },
    );
    const dejarEstado = observarEstadoPropio(setEstado);
    return () => {
      dejarChats();
      dejarEstado();
    };
  }, [yo]);

  const value = useMemo<ChatsValue>(
    () => ({
      chats: todos.filter((c) => chatVisible(c, estado[c.id])),
      estado,
      cargando,
      error,
      noLeidos: yo ? contarChatsNoLeidos(todos, estado, yo) : 0,
      conNoLeidos: (chat) => (yo ? tieneNoLeidos(chat, estado[chat.id], yo) : false),
    }),
    [todos, estado, cargando, error, yo],
  );

  return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
}

export function useChats(): ChatsValue {
  const value = useContext(ChatsContext);
  if (!value) throw new Error('useChats debe usarse dentro de ChatsProvider');
  return value;
}

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  buscarUsuarios,
  observarAmigos,
  obtenerSolicitudesEnviadasPendientesUids,
  obtenerSolicitudesPendientes,
  enviarSolicitudAmistad,
  eliminarAmigo,
  bloquearUsuario,
} from '../../services/repositorioSocial';
import type { UsuarioPerfil } from '../../types';

export function useSocialData() {
  const [amigos, setAmigos] = useState<UsuarioPerfil[]>([]);
  const [resultados, setResultados] = useState<UsuarioPerfil[]>([]);
  const [solPendientesCount, setSolPendientesCount] = useState(0);
  const [solEnviadas, setSolEnviadas] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargarBase = useCallback(async () => {
    try {
      const [pe, se] = await Promise.all([
        obtenerSolicitudesPendientes(),
        obtenerSolicitudesEnviadasPendientesUids(),
      ]);
      setSolPendientesCount(pe.length);
      setSolEnviadas(se);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos sociales');
    }
  }, []);

  useEffect(() => {
    void cargarBase();
    const unsub = observarAmigos(setAmigos);
    return unsub;
  }, [cargarBase]);

  // Search logic
  useEffect(() => {
    const q = busqueda.trim();
    // Búsqueda por nombre exacto o código de amigo: a partir de 3 caracteres
    if (q.length < 3) {
      setResultados([]);
      return;
    }
    const timer = setTimeout(async () => {
      setCargando(true);
      try {
        const r = await buscarUsuarios(q);
        setResultados(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error en búsqueda');
      } finally {
        setCargando(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const handleSendSolicitud = async (uid: string, username?: string) => {
    try {
      await enviarSolicitudAmistad(uid);
      setSolEnviadas((prev) => new Set([...prev, uid]));
      setMensaje('Solicitud enviada');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar');
      return false;
    }
  };

  const handleEliminarAmigo = async (uid: string) => {
    try {
      await eliminarAmigo(uid);
      setMensaje('Amigo eliminado');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
      return false;
    }
  };

  const handleBloquear = async (uid: string) => {
    try {
      await bloquearUsuario(uid);
      setMensaje('Usuario bloqueado');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al bloquear');
      return false;
    }
  };

  return {
    amigos,
    resultados,
    solPendientesCount,
    solEnviadas,
    busqueda,
    setBusqueda,
    cargando,
    error,
    mensaje,
    handleSendSolicitud,
    handleEliminarAmigo,
    handleBloquear,
    recargar: cargarBase,
  };
}

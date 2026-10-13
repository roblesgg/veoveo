import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  obtenerPerfilUsuario,
  actualizarUsername,
  actualizarFotoPerfil,
} from '../../services/repositorioUsuarios';
import { useBiblioteca } from '../../context/BibliotecaContext';
import type { UsuarioPerfil } from '../../types';

export function useUserProfile() {
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const { porVer, vistas } = useBiblioteca();

  // Contadores sacados de la biblioteca compartida (sin lecturas extra)
  const stats = useMemo(
    () => ({
      vistas: vistas.length,
      porVer: porVer.length,
      resenas: vistas.filter((p) => p.valoracion && p.valoracion !== 0).length,
    }),
    [porVer, vistas],
  );

  const cargarPerfil = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // El perfil lo crea AuthContext al iniciar sesión; si aún no está, se reintenta al recargar
      const u = await obtenerPerfilUsuario();
      if (!u) throw new Error('Estamos preparando tu perfil. Vuelve a intentarlo en un momento.');
      setUsuario(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No hemos podido cargar tu perfil');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarPerfil();
  }, [cargarPerfil]);

  const handleUpdateUsername = async (name: string) => {
    try {
      await actualizarUsername(name);
      setUsuario((prev) => (prev ? { ...prev, username: name.trim() } : null));
      setMensaje('Nombre actualizado');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No hemos podido cambiar el nombre');
      return false;
    }
  };

  const handleUpdateAvatar = async (url: string) => {
    try {
      await actualizarFotoPerfil(url);
      setUsuario((prev) => (prev ? { ...prev, fotoPerfil: url } : null));
      setMensaje('Foto actualizada');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No hemos podido cambiar la foto');
      return false;
    }
  };

  return {
    usuario,
    cargando,
    stats,
    error,
    mensaje,
    setError,
    setMensaje,
    recargar: cargarPerfil,
    handleUpdateUsername,
    handleUpdateAvatar,
  };
}

/**
 * ARCHIVO: context/LanguageContext.tsx
 * DESCRIPCIÓN: Gestiona el sistema de internacionalización (i18n) de la app.
 * Permite cambiar entre español e inglés y persiste la elección en el dispositivo.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Definición de idiomas soportados
type Language = 'es' | 'en';

/**
 * Estructura de los datos expuestos por el contexto de idioma.
 */
type LanguageContextValue = {
  language: Language; // Idioma actual
  setLanguage: (lang: Language) => Promise<void>; // Función para cambiar idioma
  t: (key: string) => string; // Función de traducción
};

/**
 * DICCIONARIO DE TRADUCCIONES:
 * Contiene todos los textos literales de la aplicación divididos por idioma.
 */
const translations: Record<Language, Record<string, string>> = {
  es: {
    settings: 'Ajustes',
    account: 'Cuenta',
    linked: 'Sincronizado',
    not_linked: 'Sin vincular',
    link: 'Vincular',
    unlink: 'Desvincular',
    change_password: 'Cambiar contraseña',
    delete_account: 'Eliminar cuenta',
    language: 'Idioma',
    discover: 'Descubrir',
    vistas: 'Vistas',
    por_ver: 'Por Ver',
    search: 'Buscar...',
    no_results: 'No se encontraron resultados',
    empty_vistas: 'No has marcado películas como vistas',
    empty_por_ver: 'No tienes películas por ver',
    sort: 'Ordenar',
    recientes: 'Recientes',
    alpha: 'Título (A-Z)',
    fecha_peli: 'Estreno',
    valoracion: 'Valoración',
    success: 'Éxito',
    error: 'Error',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    confirm_unlink: '¿Estás seguro de que quieres desvincular tu cuenta de Google?',
    confirm_delete: 'Esta acción no se puede deshacer. Se requiere tu contraseña para confirmar.',
    enter_password: 'Introduce tu contraseña',
    password_changed: 'Contraseña actualizada correctamente',
    reauth_failed: 'Error de re-autenticación. Verifica tu contraseña.',
    platforms: 'Mis Plataformas',
    share_app: 'Compartir App',
    share_msg:
      '¡Echa un vistazo a VeoVeo! La mejor app para organizar tu cine con amigos. Únete aquí: ',
    all: 'Todas',
  },
  en: {
    settings: 'Settings',
    account: 'Account',
    linked: 'Synced',
    not_linked: 'Not linked',
    link: 'Link',
    unlink: 'Unlink',
    change_password: 'Change Password',
    delete_account: 'Delete Account',
    language: 'Language',
    discover: 'Discover',
    vistas: 'Watched',
    por_ver: 'Watchlist',
    search: 'Search...',
    no_results: 'No results found',
    empty_vistas: "You haven't marked any movies as watched",
    empty_por_ver: 'Your watchlist is empty',
    sort: 'Sort',
    recientes: 'Recent',
    alpha: 'Title (A-Z)',
    fecha_peli: 'Release',
    valoracion: 'Rating',
    success: 'Success',
    error: 'Error',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm_unlink: 'Are you sure you want to unlink your Google account?',
    confirm_delete: 'This action cannot be undone. Password is required to confirm.',
    enter_password: 'Enter your password',
    password_changed: 'Password updated successfully',
    reauth_failed: 'Re-authentication failed. Check your password.',
    platforms: 'My Platforms',
    share_app: 'Share App',
    share_msg: 'Check out VeoVeo! The best app to organize your movies with friends. Join here: ',
    all: 'All',
  },
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/**
 * COMPONENTE: LanguageProvider
 * Carga el idioma guardado y provee la lógica de traducción.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>('es');

  // EFECTO: Recuperar el idioma persistido en AsyncStorage al iniciar
  useEffect(() => {
    void (async () => {
      const saved = await AsyncStorage.getItem('app_language');
      if (saved === 'en' || saved === 'es') {
        setLangState(saved);
      }
    })();
  }, []);

  /**
   * Cambia el idioma actual y lo guarda de forma persistente.
   */
  const setLanguage = async (lang: Language) => {
    setLangState(lang);
    await AsyncStorage.setItem('app_language', lang);
  };

  /**
   * Traduce una clave al idioma actual. Si no existe, devuelve la clave.
   */
  const t = (key: string) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook para usar traducciones en cualquier componente.
 */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

/**
 * Convierte un error de inicio de sesión en un mensaje para el usuario. El detalle técnico se
 * queda en los logs. Devuelve null si no hay nada que avisar (el usuario ha cancelado).
 */
const MENSAJES: Record<string, string> = {
  'auth/wrong-password': 'El correo o la contraseña no son correctos.',
  'auth/user-not-found': 'El correo o la contraseña no son correctos.',
  'auth/invalid-email': 'Ese correo no parece válido. Revísalo.',
  'auth/missing-password': 'Escribe tu contraseña.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  'auth/network-request-failed': 'No hay conexión. Revisa tu internet y vuelve a probar.',
  NETWORK_ERROR: 'No hay conexión. Revisa tu internet y vuelve a probar.',
  'auth/user-disabled': 'Esta cuenta está desactivada. Escríbenos si crees que es un error.',
  'auth/account-exists-with-different-credential':
    'Ya tienes una cuenta con ese correo. Entra con tu correo y contraseña.',
  'auth/popup-blocked': 'El navegador ha bloqueado la ventana de Google. Permítela y vuelve a probar.',
  PLAY_SERVICES_NOT_AVAILABLE: 'Necesitas actualizar Google Play Services para entrar con Google.',
};

const CANCELADO = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'SIGN_IN_CANCELLED',
  'IN_PROGRESS',
]);

export function mensajeErrorAuth(error: unknown, metodo: 'correo' | 'google'): string | null {
  const codigo = String((error as { code?: unknown } | null)?.code ?? '');
  if (CANCELADO.has(codigo)) return null;
  if (MENSAJES[codigo]) return MENSAJES[codigo];
  if (metodo === 'correo' && codigo === 'auth/invalid-credential') {
    return 'El correo o la contraseña no son correctos.';
  }
  return metodo === 'google'
    ? 'No hemos podido entrar con Google. Vuelve a probar o entra con tu correo.'
    : 'No hemos podido iniciar sesión. Vuelve a probar en un momento.';
}

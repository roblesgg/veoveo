import { PixelRatio } from 'react-native';

const MAX_AVATAR_PX = 512;

/**
 * URL de una foto de perfil al tamaño real en píxeles del dispositivo.
 * Las fotos de Google llegan como `…=s96-c` (96 px): se reescribe el sufijo para pedir
 * el tamaño que de verdad ocupa en pantalla. En Firestore se guarda la URL tal cual.
 */
export function avatarUrl(url: string | null | undefined, tamanoDp: number): string | null {
  if (!url || !url.trim()) return null;
  const px = Math.min(PixelRatio.getPixelSizeForLayoutSize(tamanoDp), MAX_AVATAR_PX);
  if (!/googleusercontent\.com/.test(url)) return url;
  if (/=s\d+(-c)?$/.test(url)) return url.replace(/=s\d+(-c)?$/, `=s${px}-c`);
  if (/=[^/]*$/.test(url)) return url; // otro formato de parámetros: se deja como está
  return `${url}=s${px}-c`;
}

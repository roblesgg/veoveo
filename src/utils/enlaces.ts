/**
 * Abre el enlace de un aviso (veoveo://chat/…, veoveo://match/…).
 * En el APK de pruebas el esquema es veoveotest (app.config.js): sin esto, el aviso abriría
 * la app de producción si está instalada.
 */
import Constants from 'expo-constants';
import { Linking } from 'react-native';

export function abrirEnlaceAviso(url: string) {
  const esquema = Constants.expoConfig?.scheme;
  const propio =
    typeof esquema === 'string' && esquema !== 'veoveo'
      ? url.replace(/^veoveo:\/\//, `${esquema}://`)
      : url;
  void Linking.openURL(propio);
}

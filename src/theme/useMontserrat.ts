import { Platform } from 'react-native';
import {
  useFonts,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';

/**
 * Montserrat, la única familia de VeoVeo (manual): 700 en títulos y botones, 500 en texto,
 * 800 solo en portadas («¡Es un match!»). La 600 se mantiene para las pantallas antiguas.
 */
export const FUENTES = {
  texto: 'Montserrat_500Medium',
  seminegrita: 'Montserrat_600SemiBold',
  titulo: 'Montserrat_700Bold',
  portada: 'Montserrat_800ExtraBold',
} as const;

export function useMontserrat() {
  const [loaded] = useFonts({
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });
  // En la web, con familias de reserva para que Safari no use la serif por defecto mientras carga.
  // Las listas separadas por comas solo valen en CSS (web), no en nativo.
  const fontFamily =
    Platform.OS === 'web'
      ? "Montserrat_600SemiBold, 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif"
      : 'Montserrat_600SemiBold';
  return { loaded, fontFamily };
}

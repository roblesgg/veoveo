import { Asset } from 'expo-asset';
import {
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';

const PESOS = {
  500: Montserrat_500Medium,
  600: Montserrat_600SemiBold,
  700: Montserrat_700Bold,
  800: Montserrat_800ExtraBold,
};

/**
 * En la web, un texto sin fontFamily usa la pila de react-native-web, que empieza por
 * -apple-system. Declarar ese nombre con @font-face hace que esos textos salgan en Montserrat
 * con su peso, sin tocar los que ya llevan fuente propia (como los iconos).
 */
export function fuenteBaseWeb(): string {
  return Object.entries(PESOS)
    .map(
      ([peso, modulo]) =>
        `@font-face { font-family: '-apple-system'; font-weight: ${peso}; font-style: normal; font-display: swap; src: url('${Asset.fromModule(modulo).uri}') format('truetype'); }`
    )
    .join('\n');
}

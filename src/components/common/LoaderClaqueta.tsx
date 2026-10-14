/**
 * Indicador de carga de toda la app, en tres tamaños: «pequeno» (dentro de botones y filas),
 * «mediano» (secciones) y «grande» (pantalla completa). Donde ya se sabe la forma de lo que viene
 * (carruseles, biblioteca) se usan esqueletos (Esqueleto.tsx), no esto.
 *
 * El movimiento es el loader de referencia de Álvaro (LoaderCaida.tsx). La forma y el color se
 * eligen aquí, en un solo sitio (FORMA_LOADER y COLOR_LOADER).
 */
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';
import { LoaderCaida, type ColorLoader, type FormaLoader } from './LoaderCaida';

// Pendiente de la elección de Álvaro (fiel al original: peonza)
export const FORMA_LOADER: FormaLoader = 'peonza';
export const COLOR_LOADER: ColorLoader = 'turquesa';

// Lado de una pieza en su punto más grande. El grande es el del original (caja de 100 a escala 0,5).
const TAMANOS = { pequeno: 16, mediano: 30, grande: 50 } as const;

type Props = {
  texto?: string;
  tamano?: number | keyof typeof TAMANOS;
  /** Solo dentro de botones de color: el color de su texto, para que se vea */
  color?: string;
};

export function LoaderClaqueta({ texto, tamano = 'grande', color }: Props) {
  const lado = typeof tamano === 'number' ? tamano : TAMANOS[tamano];
  // Las piezas entran desde arriba (hasta 2 lados por encima): se reserva sitio salvo en pequeño
  const holgura = lado >= 30 ? lado : 0;
  return (
    <View
      style={[styles.contenedor, { paddingTop: holgura }]}
      accessibilityRole="progressbar"
      accessibilityLabel={texto ?? 'Cargando'}
    >
      <LoaderCaida lado={lado} forma={FORMA_LOADER} color={COLOR_LOADER} propio={color} />
      {texto ? <Text style={styles.texto}>{texto}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  texto: { color: COLORS.textMuted, fontSize: 14, fontFamily: FUENTES.texto },
});

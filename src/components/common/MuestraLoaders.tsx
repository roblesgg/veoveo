/**
 * SOLO EN EL APK DE PRUEBAS: las seis combinaciones del loader (3 formas × 2 colores), numeradas,
 * para que Álvaro elija en su móvil. Se quita en cuanto elija.
 */
import { StyleSheet, Text, View } from 'react-native';
import { LoaderCaida, type ColorLoader, type FormaLoader } from './LoaderCaida';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';

const OPCIONES: { forma: FormaLoader; color: ColorLoader; nombre: string }[] = [
  { forma: 'peonza', color: 'morado', nombre: 'Peonza morada (el original)' },
  { forma: 'peonza', color: 'turquesa', nombre: 'Peonza turquesa' },
  { forma: 'palomita', color: 'morado', nombre: 'Palomita morada' },
  { forma: 'palomita', color: 'turquesa', nombre: 'Palomita turquesa' },
  { forma: 'claqueta', color: 'morado', nombre: 'Claqueta morada' },
  { forma: 'claqueta', color: 'turquesa', nombre: 'Claqueta turquesa' },
];

export function MuestraLoaders() {
  return (
    <View style={styles.caja}>
      <Text style={styles.titulo}>Elige el loader (solo pruebas)</Text>
      <View style={styles.rejilla}>
        {OPCIONES.map((o, i) => (
          <View key={o.nombre} style={styles.opcion}>
            <View style={styles.escenario}>
              <LoaderCaida lado={40} forma={o.forma} color={o.color} />
            </View>
            <Text style={styles.numero}>{i + 1}</Text>
            <Text style={styles.nombre}>{o.nombre}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { gap: 12, marginTop: 12 },
  titulo: { color: COLORS.text, fontSize: 16, fontFamily: FUENTES.titulo },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  opcion: { width: '50%', alignItems: 'center', gap: 4 },
  // Alto de sobra: las piezas entran desde 2 lados por encima
  escenario: { height: 130, justifyContent: 'flex-end', paddingBottom: 30, overflow: 'hidden' },
  numero: { color: COLORS.accent, fontSize: 18, fontFamily: FUENTES.titulo },
  nombre: { color: COLORS.textMuted, fontSize: 12, fontFamily: FUENTES.texto, textAlign: 'center' },
});

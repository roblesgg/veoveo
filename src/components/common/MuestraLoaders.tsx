/**
 * SOLO EN EL APK DE PRUEBAS: el loader de estrellas en los dos colores posibles (1 morado, el del
 * original; 2 turquesa, el de la marca), en tamaño grande y pequeño, para que Álvaro elija.
 * Se quita en cuanto elija.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cargarPortada, guardarPortada, type Portada } from '../../storage/pruebasDiseno';
import { LoaderCaida, type ColorLoader } from './LoaderCaida';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';

const OPCIONES: { color: ColorLoader; nombre: string }[] = [
  { color: 'morado', nombre: 'Morado (el original)' },
  { color: 'turquesa', nombre: 'Turquesa (VeoVeo)' },
];

export function MuestraLoaders() {
  const [portada, setPortada] = useState<Portada>('nitida');
  useEffect(() => {
    void cargarPortada().then(setPortada);
  }, []);
  const elegirPortada = (p: Portada) => {
    setPortada(p);
    void guardarPortada(p);
  };
  return (
    <View style={styles.caja}>
      <Text style={styles.titulo}>Portada de la ficha (solo pruebas)</Text>
      <View style={styles.rejilla}>
        {(['nitida', 'desenfocada'] as const).map((p, i) => (
          <Pressable
            key={p}
            onPress={() => elegirPortada(p)}
            style={[styles.botonPortada, portada === p && styles.botonPortadaOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: portada === p }}
          >
            <Text style={styles.numero}>{i + 1}</Text>
            <Text style={styles.nombre}>
              {p === 'nitida' ? 'Cartel grande nítido' : 'Fondo desenfocado + cartel'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.nombre}>Elige una y abre cualquier peli para verla.</Text>
      <Text style={styles.titulo}>Elige el color del loader (solo pruebas)</Text>
      <View style={styles.rejilla}>
        {OPCIONES.map((o, i) => (
          <View key={o.color} style={styles.opcion}>
            <View style={styles.escenario}>
              <LoaderCaida lado={50} color={o.color} />
            </View>
            <View style={styles.escenarioPequeno}>
              <LoaderCaida lado={16} color={o.color} />
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
  caja: { gap: 12, marginTop: 12, marginBottom: 12 },
  botonPortada: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  botonPortadaOn: { borderColor: COLORS.accent, backgroundColor: 'rgba(105,223,217,0.1)' },
  titulo: { color: COLORS.text, fontSize: 16, fontFamily: FUENTES.titulo },
  rejilla: { flexDirection: 'row' },
  opcion: { width: '50%', alignItems: 'center', gap: 6 },
  // Alto de sobra: las estrellas entran desde 2 lados por encima del sitio donde se paran
  escenario: { height: 170, justifyContent: 'flex-end', paddingBottom: 46 },
  escenarioPequeno: { height: 56, justifyContent: 'flex-end', paddingBottom: 14 },
  numero: { color: COLORS.accent, fontSize: 18, fontFamily: FUENTES.titulo },
  nombre: { color: COLORS.textMuted, fontSize: 12, fontFamily: FUENTES.texto, textAlign: 'center' },
});

/**
 * Cambiar cuándo se vio una peli (mantener pulsada en Biblioteca → Vistas). Las mismas tres
 * opciones que al marcarla como vista, con la actual marcada: una sola forma de hacerlo en la app.
 * Si se elige la opción que ya tenía, no se toca la fecha exacta guardada.
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { actualizarFechaVisto, fechaDeVista } from '../../services/repositorioPeliculasUsuario';
import type { PeliculaUsuario } from '../../types';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';
import { SelectorFechaVista, cuandoDeFecha, fechaDeCuando } from './SelectorFechaVista';
import { FondoCristal } from '../common/FondoCristal';

type Props = {
  pelicula: PeliculaUsuario | null;
  onCerrar: () => void;
};

export function HojaCuandoVista({ pelicula, onCerrar }: Props) {
  const insets = useSafeAreaInsets();
  const actual = pelicula ? cuandoDeFecha(fechaDeVista(pelicula) || null) : 'semana';

  return (
    <Modal
      visible={Boolean(pelicula)}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
      statusBarTranslucent
    >
      <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel="Cerrar" />
      <View style={[styles.hoja, { paddingBottom: insets.bottom + 20 }]}>
        <FondoCristal />
        <Text style={styles.titulo} numberOfLines={2}>
          {pelicula?.titulo}
        </Text>
        <SelectorFechaVista
          valor={actual}
          fontFamily={FUENTES.texto}
          onCambio={(v) => {
            const peli = pelicula;
            onCerrar();
            if (!peli || v === actual) return;
            void actualizarFechaVisto(peli.idPelicula, fechaDeCuando(v)).catch(() => undefined);
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,6,23,0.65)' },
  hoja: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 6,
  },
  titulo: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: FUENTES.titulo,
    textAlign: 'center',
    marginBottom: 8,
  },
});

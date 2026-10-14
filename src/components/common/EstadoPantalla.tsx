/**
 * Estados de pantalla comunes: error con "Reintentar" y vacío con explicación.
 * Mismo aspecto en toda la app (marca: Montserrat, celeste para la acción).
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconCloudOff } from '@tabler/icons-react-native';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';
import { Pulsable } from './Pulsable';

export function EstadoError({
  texto = 'No hemos podido cargar esto. Revisa la conexión.',
  onReintentar,
}: {
  texto?: string;
  onReintentar?: () => void;
}) {
  return (
    <View style={styles.caja} accessibilityRole="alert">
      <IconCloudOff size={48} color={COLORS.textMuted} strokeWidth={1.5} />
      <Text style={styles.texto}>{texto}</Text>
      {onReintentar && (
        <Pulsable onPress={onReintentar} style={styles.boton} accessibilityRole="button">
          <Text style={styles.botonTexto}>Reintentar</Text>
        </Pulsable>
      )}
    </View>
  );
}

export function EstadoVacio({
  icono,
  titulo,
  texto,
}: {
  icono?: ReactNode;
  titulo: string;
  texto?: string;
}) {
  return (
    <View style={styles.caja}>
      {icono}
      <Text style={styles.titulo}>{titulo}</Text>
      {texto ? <Text style={styles.texto}>{texto}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  titulo: { color: COLORS.text, fontSize: 18, fontFamily: FUENTES.titulo, textAlign: 'center' },
  texto: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
  },
  boton: {
    marginTop: 4,
    height: 46,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
  },
  botonTexto: { color: COLORS.onAccent, fontSize: 15, fontFamily: FUENTES.titulo },
});

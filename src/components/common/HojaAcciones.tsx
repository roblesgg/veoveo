/**
 * Hoja de acciones (pulsación larga): lista de opciones que sube desde abajo.
 * Las peligrosas (borrar, salir) en rojo.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';
import { FondoCristal } from './FondoCristal';
import { HojaBase } from './HojaBase';

export type Accion = {
  texto: string;
  icono: (color: string) => ReactNode;
  onPress: () => void;
  peligro?: boolean;
};

type Props = {
  visible: boolean;
  onCerrar: () => void;
  acciones: Accion[];
  /** Contenido encima de las opciones (por ejemplo, el mensaje seleccionado) */
  cabecera?: ReactNode;
};

export function HojaAcciones({ visible, onCerrar, acciones, cabecera }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <HojaBase visible={visible} onCerrar={onCerrar}>
      <View style={[styles.zona, { paddingBottom: insets.bottom + 16 }]}>
        {cabecera}
        <View style={styles.hoja}>
          <FondoCristal />
          {acciones.map((a) => {
            const color = a.peligro ? COLORS.error : COLORS.text;
            return (
              <Pressable
                key={a.texto}
                style={({ pressed }) => [styles.fila, pressed && styles.filaPulsada]}
                onPress={() => {
                  onCerrar();
                  a.onPress();
                }}
                accessibilityRole="button"
              >
                {a.icono(a.peligro ? COLORS.error : COLORS.textMuted)}
                <Text style={[styles.texto, { color }]}>{a.texto}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </HojaBase>
  );
}

const styles = StyleSheet.create({
  zona: { paddingHorizontal: 12, gap: 12 },
  hoja: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 6,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  filaPulsada: { backgroundColor: 'rgba(255,255,255,0.05)' },
  texto: { fontSize: 16, fontFamily: FUENTES.texto },
});

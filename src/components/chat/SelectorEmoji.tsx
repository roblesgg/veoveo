/**
 * Emoji de un grupo: botón redondo que abre una rejilla de emojis de cine y planes.
 */
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';

export const EMOJIS_GRUPO = ['🍿', '🎬', '🎥', '📽️', '🎞️', '🍕', '🛋️', '🌙', '🔥', '❤️', '👻', '🤖', '🦖', '🚀', '🎉', '⭐', '😂', '🍷', '🧛', '🕵️'];

export function SelectorEmoji({ valor, onCambio, tamano = 52 }: { valor: string; onCambio: (e: string) => void; tamano?: number }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setAbierto(true)}
        style={[styles.boton, { width: tamano, height: tamano, borderRadius: tamano / 2 }]}
        accessibilityLabel="Cambiar emoji del grupo"
      >
        <Text style={{ fontSize: tamano * 0.5 }}>{valor}</Text>
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={styles.fondo} onPress={() => setAbierto(false)}>
          <View style={styles.hoja}>
            <Text style={styles.titulo}>Emoji del grupo</Text>
            <View style={styles.rejilla}>
              {EMOJIS_GRUPO.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => {
                    onCambio(e);
                    setAbierto(false);
                  }}
                  style={[styles.celda, e === valor && styles.celdaOn]}
                >
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  boton: {
    backgroundColor: 'rgba(105,223,217,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(105,223,217,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fondo: { flex: 1, backgroundColor: 'rgba(2,6,23,0.7)', justifyContent: 'center', padding: 24 },
  hoja: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  titulo: { color: COLORS.text, fontSize: 18, fontFamily: FUENTES.titulo, marginBottom: 14 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  celda: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  celdaOn: { backgroundColor: 'rgba(105,223,217,0.2)', borderWidth: 1, borderColor: COLORS.accent },
});

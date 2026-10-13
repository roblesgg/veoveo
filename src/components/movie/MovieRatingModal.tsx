import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/theme';
import { SelectorFechaVista } from './SelectorFechaVista';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Guarda la peli como vista con su nota (0 = sin nota) y la fecha en que se vio. */
  onGuardar: (valor: number, fechaVisto: number) => void;
  titulo?: string;
  valorInicial: number;
  /** Fecha de vista actual (si ya está vista) o undefined para "hoy". */
  fechaInicial?: number;
  fontFamily: string;
};

export const MovieRatingModal = React.memo(
  ({ visible, onClose, onGuardar, titulo, valorInicial, fechaInicial, fontFamily }: Props) => {
    const [valorSel, setValorSel] = React.useState(valorInicial > 0 ? valorInicial : 0);
    const [valorNegativa, setValorNegativa] = React.useState(valorInicial === -1);
    const [fecha, setFecha] = React.useState(fechaInicial ?? Date.now());

    React.useEffect(() => {
      if (visible) {
        setValorSel(valorInicial > 0 ? valorInicial : 0);
        setValorNegativa(valorInicial === -1);
        setFecha(fechaInicial ?? Date.now());
      }
    }, [visible, valorInicial, fechaInicial]);

    const handleGuardar = () => {
      const v = valorNegativa ? -1 : valorSel;
      onGuardar(v, fecha);
    };

    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

          <View style={[styles.macModalWrap, SHADOWS.mac]}>
            <BlurView intensity={90} style={StyleSheet.absoluteFill} />
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 10, 20, 0.92)' }]}
            />

            <View style={styles.macModalInner}>
              <Text style={[styles.modalTitle, { fontFamily }]} numberOfLines={2}>
                Valorar: {titulo}
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily,
                  marginBottom: 20,
                  textAlign: 'center',
                }}
              >
                ¿Qué te ha parecido la peli?
              </Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => {
                      setValorSel(n);
                      setValorNegativa(false);
                    }}
                    style={styles.starBtn}
                  >
                    <Ionicons
                      name={!valorNegativa && n <= valorSel ? 'star' : 'star-outline'}
                      size={36}
                      color={!valorNegativa && n <= valorSel ? '#FFD700' : 'rgba(255,255,255,0.2)'}
                    />
                  </Pressable>
                ))}
              </View>

              <View style={styles.poopBox}>
                <Pressable
                  style={[styles.poopBtn, valorNegativa && styles.poopBtnOn]}
                  onPress={() => {
                    setValorNegativa(true);
                    setValorSel(-1);
                  }}
                >
                  <Text style={{ fontSize: 28, opacity: valorNegativa ? 1 : 0.4 }}>💩</Text>
                  <Text
                    style={[
                      styles.poopLabel,
                      { fontFamily, color: valorNegativa ? '#8B4513' : 'rgba(255,255,255,0.4)' },
                    ]}
                  >
                    Nefasta
                  </Text>
                </Pressable>
              </View>

              <SelectorFechaVista fecha={fecha} onCambio={setFecha} fontFamily={fontFamily} />

              <View style={styles.modalActions}>
                <Pressable style={styles.modalActionSec} onPress={onClose}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontFamily }}>Cancelar</Text>
                </Pressable>

                {/* Guarda como vista sin nota (o le quita la nota). Nunca la quita de la biblioteca. */}
                <Pressable style={styles.modalActionSec} onPress={() => onGuardar(0, fecha)}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontFamily }}>Sin nota</Text>
                </Pressable>

                <Pressable
                  onPress={handleGuardar}
                  disabled={valorSel === 0 && !valorNegativa}
                  style={[
                    styles.saveBtnMain,
                    valorSel === 0 && !valorNegativa && { opacity: 0.4 },
                  ]}
                >
                  <Text
                    style={{ color: '#fff', fontFamily, fontWeight: '800', fontSize: 16 }}
                  >
                    Guardar
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  macModalWrap: { width: '100%', maxWidth: 340, borderRadius: 28, overflow: 'hidden' },
  macModalInner: { padding: 24, alignItems: 'center' },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 24, justifyContent: 'center' },
  starBtn: { padding: 4 },
  poopBox: { marginBottom: 32, alignItems: 'center' },
  poopBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  poopBtnOn: { backgroundColor: 'rgba(139, 69, 19, 0.2)', borderColor: 'rgba(139, 69, 19, 0.4)' },
  poopLabel: { fontSize: 13, fontWeight: '600' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalActionSec: { padding: 10, alignSelf: 'center' },
  saveBtnMain: { 
    backgroundColor: '#38bdf8',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});

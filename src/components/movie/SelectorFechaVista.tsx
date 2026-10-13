/**
 * Selector de "¿Cuándo la viste?": atajos (hoy, ayer, hace una semana…) y fecha exacta
 * con el selector nativo. En la web, solo los atajos.
 */
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { formatearFechaVista } from '../../utils/fechas';

const DIA = 24 * 60 * 60 * 1000;

const ATAJOS: { etiqueta: string; haceDias: number }[] = [
  { etiqueta: 'Hoy', haceDias: 0 },
  { etiqueta: 'Ayer', haceDias: 1 },
  { etiqueta: 'Hace una semana', haceDias: 7 },
  { etiqueta: 'Hace un mes', haceDias: 30 },
  { etiqueta: 'Hace un año', haceDias: 365 },
];

type Props = {
  fecha: number;
  onCambio: (fecha: number) => void;
  fontFamily: string;
};

export function SelectorFechaVista({ fecha, onCambio, fontFamily }: Props) {
  const [abierto, setAbierto] = React.useState(false);

  const onElegirFecha = (evento: DateTimePickerEvent, elegida?: Date) => {
    setAbierto(false);
    if (evento.type === 'set' && elegida) onCambio(elegida.getTime());
  };

  return (
    <View style={styles.contenedor}>
      <Text style={[styles.etiqueta, { fontFamily }]}>¿Cuándo la viste?</Text>
      <View style={styles.atajos}>
        {ATAJOS.map(({ etiqueta, haceDias }) => {
          const valor = Date.now() - haceDias * DIA;
          const activo = Math.abs(fecha - valor) < DIA / 2;
          return (
            <Pressable
              key={etiqueta}
              onPress={() => onCambio(valor)}
              style={[styles.chip, activo && styles.chipActivo]}
            >
              <Text style={[styles.chipTexto, { fontFamily }, activo && styles.chipTextoActivo]}>
                {etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {Platform.OS !== 'web' && (
        <Pressable onPress={() => setAbierto(true)} style={styles.fechaExacta} hitSlop={8}>
          <Ionicons name="calendar-outline" size={16} color="#38BDF8" />
          <Text style={[styles.fechaExactaTexto, { fontFamily }]}>{formatearFechaVista(fecha)}</Text>
        </Pressable>
      )}
      {abierto && (
        <DateTimePicker
          value={new Date(fecha)}
          mode="date"
          maximumDate={new Date()}
          onChange={onElegirFecha}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { width: '100%', marginBottom: 20, alignItems: 'center' },
  etiqueta: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 10 },
  atajos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActivo: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  chipTexto: { color: '#F8FAFC', fontSize: 13 },
  chipTextoActivo: { color: '#020617', fontWeight: '700' },
  fechaExacta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  fechaExactaTexto: { color: '#38BDF8', fontSize: 14, fontWeight: '600' },
});

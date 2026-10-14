/**
 * «¿Cuándo la viste?»: tres opciones y nada más (esta semana, este mes, antes).
 * «Antes» no inventa fecha: la peli queda vista sin fecha y no sale en «vistas recientes».
 * La fecha exacta se cambia manteniendo pulsada la peli en la Biblioteca.
 */
import { StyleSheet, Text, View } from 'react-native';
import { Segmentos } from '../common/Botones';

const DIA = 24 * 60 * 60 * 1000;

export type CuandoVista = 'semana' | 'mes' | 'antes';

/** La fecha que se guarda para cada opción (null = sin fecha). */
export function fechaDeCuando(cuando: CuandoVista): number | null {
  if (cuando === 'semana') return Date.now();
  if (cuando === 'mes') return Date.now() - 15 * DIA;
  return null;
}

/** La opción que corresponde a una fecha ya guardada (para marcarla al abrir). */
export function cuandoDeFecha(fecha: number | null | undefined): CuandoVista {
  if (!fecha) return 'antes';
  const dias = (Date.now() - fecha) / DIA;
  return dias <= 7 ? 'semana' : dias <= 31 ? 'mes' : 'antes';
}

const OPCIONES: { valor: CuandoVista; texto: string }[] = [
  { valor: 'semana', texto: 'Esta semana' },
  { valor: 'mes', texto: 'Este mes' },
  { valor: 'antes', texto: 'Antes' },
];

type Props = {
  valor: CuandoVista;
  onCambio: (valor: CuandoVista) => void;
  fontFamily: string;
};

export function SelectorFechaVista({ valor, onCambio, fontFamily }: Props) {
  return (
    <View style={styles.contenedor}>
      <Text style={[styles.etiqueta, { fontFamily }]}>¿Cuándo la viste?</Text>
      <Segmentos opciones={OPCIONES} valor={valor} onCambio={onCambio} estilo={styles.segmentos} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { width: '100%', marginBottom: 20, alignItems: 'center' },
  etiqueta: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 10 },
  segmentos: { width: '100%' },
});

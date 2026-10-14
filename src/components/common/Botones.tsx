/**
 * Botones y segmentos de toda la app (una sola forma de hacerlo).
 * - BotonPrincipal: píldora de 52 de alto, celeste (o en «peligro», rojo; o «secundario», de
 *   cristal), con Pulsable de serie (se hunde al tocar) y el loader pequeño mientras espera.
 * - Segmentos: control de opciones excluyentes (píldora con la opción activa en celeste).
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';
import { Cargando } from './Cargando';
import { Pulsable } from './Pulsable';

type Variante = 'principal' | 'secundario' | 'peligro';

export function BotonPrincipal({
  texto,
  onPress,
  variante = 'principal',
  cargando,
  desactivado,
  icono,
  estilo,
  etiqueta,
}: {
  texto: string;
  onPress: () => void;
  variante?: Variante;
  /** Muestra el loader pequeño y no deja pulsar */
  cargando?: boolean;
  desactivado?: boolean;
  icono?: ReactNode;
  estilo?: StyleProp<ViewStyle>;
  /** Etiqueta de accesibilidad si el texto no basta */
  etiqueta?: string;
}) {
  const colorTexto =
    variante === 'principal' ? COLORS.onAccent : variante === 'peligro' ? '#fff' : COLORS.text;
  return (
    <Pulsable
      onPress={onPress}
      disabled={desactivado || cargando}
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? texto}
      accessibilityState={{ disabled: desactivado || cargando, busy: cargando }}
      style={[
        styles.boton,
        variante === 'principal' && styles.principal,
        variante === 'secundario' && styles.secundario,
        variante === 'peligro' && styles.peligro,
        desactivado && !cargando && styles.apagado,
        estilo,
      ]}
    >
      {cargando ? (
        <Cargando tamano="pequeno" color={colorTexto} />
      ) : (
        <View style={styles.fila}>
          {icono}
          <Text style={[styles.texto, { color: colorTexto }]} numberOfLines={1}>
            {texto}
          </Text>
        </View>
      )}
    </Pulsable>
  );
}

export function Segmentos<T extends string | boolean>({
  opciones,
  valor,
  onCambio,
  estilo,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambio: (v: T) => void;
  estilo?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segmentos, estilo]} accessibilityRole="radiogroup">
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pulsable
            key={String(o.valor)}
            onPress={() => onCambio(o.valor)}
            style={[styles.segmento, activo && styles.segmentoOn]}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo }}
          >
            <Text style={[styles.segmentoTexto, activo && styles.segmentoTextoOn]} numberOfLines={1}>
              {o.texto}
            </Text>
          </Pulsable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  boton: {
    height: 52,
    borderRadius: 999,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  principal: { backgroundColor: COLORS.primary },
  secundario: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  peligro: { backgroundColor: COLORS.error },
  apagado: { opacity: 0.4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  texto: { fontSize: 16, fontFamily: FUENTES.titulo },
  segmentos: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  segmento: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentoOn: { backgroundColor: COLORS.primary },
  segmentoTexto: { color: COLORS.text, fontSize: 14, fontFamily: FUENTES.texto },
  segmentoTextoOn: { color: COLORS.onAccent, fontFamily: FUENTES.titulo },
});

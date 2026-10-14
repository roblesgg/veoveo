/**
 * Campos de texto de toda la app, con los valores del manual de marca:
 * fondo #1E293B, borde rgba(255,255,255,.14), radio píldora (999) en los de una línea y 18 en los
 * de varias, texto #F8FAFC, pista #94A3B8, foco celeste #38BDF8 y Montserrat 16.
 * - CampoBusqueda: lupa delante y botón de borrar cuando hay texto.
 * - CampoTexto: formularios (correo, contraseña, nombre, bio…). Admite varias líneas.
 * Mismas props que TextInput (lo que se pase de más llega al TextInput).
 */
import { forwardRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { IconSearch, IconX } from '@tabler/icons-react-native';
import { FUENTES } from '../../theme/useMontserrat';

const FONDO = '#1E293B';
const BORDE = 'rgba(255,255,255,0.14)';
const TEXTO = '#F8FAFC';
const PISTA = '#94A3B8';
const FOCO = '#38BDF8';

type Comunes = TextInputProps & {
  /** Estilo del contenedor (márgenes, ancho); el aspecto lo pone el componente */
  estilo?: StyleProp<ViewStyle>;
};

function Caja({
  enfocado,
  multilinea,
  estilo,
  children,
}: {
  enfocado: boolean;
  multilinea?: boolean;
  estilo?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.caja,
        multilinea ? styles.cajaMultilinea : styles.cajaLinea,
        enfocado && styles.cajaFoco,
        estilo,
      ]}
    >
      {children}
    </View>
  );
}

export const CampoBusqueda = forwardRef<TextInput, Comunes>(function CampoBusqueda(
  { estilo, value, onChangeText, onFocus, onBlur, style, ...resto },
  ref,
) {
  const [enfocado, setEnfocado] = useState(false);
  return (
    <Caja enfocado={enfocado} estilo={estilo}>
      <IconSearch size={18} color={enfocado ? FOCO : PISTA} strokeWidth={2} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={PISTA}
        selectionColor={FOCO}
        returnKeyType="search"
        autoCorrect={false}
        onFocus={(e) => {
          setEnfocado(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setEnfocado(false);
          onBlur?.(e);
        }}
        style={[styles.texto, style]}
        {...resto}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText?.('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Borrar la búsqueda"
          style={styles.borrar}
        >
          <IconX size={14} color="#020617" strokeWidth={3} />
        </Pressable>
      ) : null}
    </Caja>
  );
});

export const CampoTexto = forwardRef<TextInput, Comunes & { icono?: ReactNode }>(
  function CampoTexto({ estilo, icono, multiline, onFocus, onBlur, style, ...resto }, ref) {
    const [enfocado, setEnfocado] = useState(false);
    return (
      <Caja enfocado={enfocado} multilinea={multiline} estilo={estilo}>
        {icono}
        <TextInput
          ref={ref}
          multiline={multiline}
          placeholderTextColor={PISTA}
          selectionColor={FOCO}
          onFocus={(e) => {
            setEnfocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            onBlur?.(e);
          }}
          style={[styles.texto, multiline && styles.textoMultilinea, style]}
          {...resto}
        />
      </Caja>
    );
  },
);

const styles = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: FONDO,
    borderWidth: 1,
    borderColor: BORDE,
    paddingHorizontal: 18,
  },
  cajaLinea: { minHeight: 50, borderRadius: 999 },
  cajaMultilinea: { minHeight: 96, borderRadius: 18, alignItems: 'flex-start', paddingVertical: 12 },
  cajaFoco: { borderColor: FOCO },
  texto: {
    flex: 1,
    color: TEXTO,
    fontSize: 16,
    fontFamily: FUENTES.texto,
    paddingVertical: 12,
  },
  textoMultilinea: { paddingVertical: 0, textAlignVertical: 'top', minHeight: 72 },
  borrar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PISTA,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

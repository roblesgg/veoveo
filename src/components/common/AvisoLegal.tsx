/**
 * «Al crear la cuenta aceptas las normas y la privacidad» con enlaces a la web.
 * Google Play pide que quien crea contenido acepte unas normas que prohíben el contenido
 * ofensivo (política de contenido generado por usuarios).
 */
import { Linking, StyleSheet, Text } from 'react-native';
import { COLORS } from '../../theme/colors';

export const URL_NORMAS = 'https://veoveo.dripdev.dev/normas';
export const URL_PRIVACIDAD = 'https://veoveo.dripdev.dev/privacidad';

/** `inicio`: «Al crear la cuenta» (registro) o «Al continuar» (Google, que la crea si no existe) */
export function AvisoLegal({
  fontFamily,
  inicio = 'Al crear la cuenta',
}: {
  fontFamily?: string;
  inicio?: string;
}) {
  return (
    <Text style={[styles.texto, { fontFamily }]}>
      {inicio} aceptas las{' '}
      <Text
        style={styles.enlace}
        onPress={() => void Linking.openURL(URL_NORMAS)}
        accessibilityRole="link"
      >
        normas de la comunidad
      </Text>{' '}
      y la{' '}
      <Text
        style={styles.enlace}
        onPress={() => void Linking.openURL(URL_PRIVACIDAD)}
        accessibilityRole="link"
      >
        política de privacidad
      </Text>
      .
    </Text>
  );
}

const styles = StyleSheet.create({
  texto: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 12,
  },
  enlace: { color: COLORS.primary, textDecorationLine: 'underline' },
});

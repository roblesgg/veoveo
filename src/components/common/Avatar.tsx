/**
 * Foto de perfil redonda a la resolución real del dispositivo, con caché en disco.
 * Si no hay foto, la inicial del nombre.
 */
import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { avatarUrl } from '../../utils/imagenes';

type Props = {
  uri?: string | null;
  nombre?: string | null;
  /** Diámetro en dp */
  tamano: number;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ uri, nombre, tamano, style }: Props) {
  const fuente = avatarUrl(uri, tamano);
  const redondo = { width: tamano, height: tamano, borderRadius: tamano / 2 };
  if (!fuente) {
    return (
      <View style={[styles.vacio, redondo, style]}>
        <Text style={[styles.inicial, { fontSize: tamano * 0.42 }]}>
          {(nombre?.trim()?.[0] ?? '?').toUpperCase()}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: fuente }}
      style={[redondo, style as object]}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={fuente}
      transition={150}
    />
  );
}

const styles = StyleSheet.create({
  vacio: { backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  inicial: { color: '#F8FAFC', fontWeight: '700' },
});

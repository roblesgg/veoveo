/**
 * Fondo de cristal para hojas y paneles: desenfoque fijo de lo que hay detrás más un velo oscuro
 * que asegura el contraste. La intensidad no se anima nunca (en Android redibujaría el desenfoque
 * en cada fotograma); si hace falta, se funde la capa entera.
 */
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

export function FondoCristal({ velo = 'rgba(15,23,42,0.72)' }: { velo?: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <BlurView
        intensity={60}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: velo }]} />
    </View>
  );
}

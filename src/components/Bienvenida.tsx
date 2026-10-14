/**
 * Bienvenida para usuarios nuevos: tres pantallas, una sola vez por dispositivo.
 * Se puede saltar. La marca de "vista" va en AsyncStorage (si falla, simplemente vuelve a salir).
 */
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconCards } from '@tabler/icons-react-native';
import { IconoClaqueta, IconoPalomitas } from './iconos/IconosPropios';
import { BotonPrincipal } from './common/Botones';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';

export const CLAVE_BIENVENIDA = 'veoveo_bienvenida_3_vista';

export async function bienvenidaPendiente(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLAVE_BIENVENIDA)) !== '1';
  } catch {
    return false;
  }
}

const PANTALLAS = [
  {
    icono: <IconoPalomitas size={96} />,
    titulo: 'Descubre qué ver',
    texto:
      'Tendencias, estrenos y recomendaciones según lo que te gusta. Y dónde verlo en tus plataformas.',
  },
  {
    icono: <IconoClaqueta size={88} color={COLORS.primary} />,
    titulo: 'Tu biblioteca',
    texto:
      'Guarda lo que quieres ver y valora lo que ya has visto. Tus amigos lo ven si tú quieres.',
  },
  {
    icono: <IconCards size={88} color={COLORS.accent} strokeWidth={1.5} />,
    titulo: 'Decidid juntos',
    texto:
      'Chatea con tus amigos y usad el Movie Match: deslizad y encontrad la peli que os apetece a todos.',
  },
];

export function Bienvenida({ onTerminar }: { onTerminar: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [pagina, setPagina] = useState(0);
  const scroll = useRef<ScrollView>(null);

  const terminar = () => {
    AsyncStorage.setItem(CLAVE_BIENVENIDA, '1').catch(() => undefined);
    onTerminar();
  };
  const siguiente = () => {
    if (pagina === PANTALLAS.length - 1) return terminar();
    scroll.current?.scrollTo({ x: width * (pagina + 1), animated: true });
  };

  return (
    <View
      style={[styles.fondo, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
    >
      <Pressable onPress={terminar} style={styles.saltar} hitSlop={12} accessibilityRole="button">
        <Text style={styles.saltarTexto}>Saltar</Text>
      </Pressable>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPagina(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {PANTALLAS.map((p) => (
          <View key={p.titulo} style={[styles.pantalla, { width }]}>
            <View style={styles.icono}>{p.icono}</View>
            <Text style={styles.titulo}>{p.titulo}</Text>
            <Text style={styles.texto}>{p.texto}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.puntos}>
        {PANTALLAS.map((p, i) => (
          <View key={p.titulo} style={[styles.punto, i === pagina && styles.puntoOn]} />
        ))}
      </View>
      <BotonPrincipal
        texto={pagina === PANTALLAS.length - 1 ? 'Empezar' : 'Siguiente'}
        onPress={siguiente}
        estilo={styles.boton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { ...StyleSheet.absoluteFillObject, zIndex: 900, backgroundColor: COLORS.background },
  saltar: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8 },
  saltarTexto: { color: COLORS.textMuted, fontSize: 15, fontFamily: FUENTES.seminegrita },
  pantalla: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 18,
  },
  icono: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  titulo: { color: COLORS.text, fontSize: 28, fontFamily: FUENTES.portada, textAlign: 'center' },
  texto: {
    color: COLORS.textMuted,
    fontSize: 16,
    lineHeight: 23,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
    maxWidth: 340,
  },
  puntos: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  puntoOn: { width: 24, backgroundColor: COLORS.primary },
  boton: { marginHorizontal: 20 },
});

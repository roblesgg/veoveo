/**
 * Muro de Social: filas horizontales con lo que ven tus amigos. Sobre todo imagen: el cartel ya
 * dice qué peli es y la cara qué amigo, así que no se repiten título ni nombre debajo (siguen en
 * la etiqueta de accesibilidad; sin cartel, sale el título; sin foto, la inicial).
 */
import { memo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { IconStarFilled } from '@tabler/icons-react-native';
import { posterUrl } from '../../services/tmdbClient';
import type { MuroAmigos as Muro, PeliDeAmigos } from '../../services/muroAmigos';
import type { Categoria } from '../../hooks/social/useMuro';
import type { UsuarioPerfil } from '../../types';
import { Avatar } from '../common/Avatar';
import { EsqueletoFilaPosters } from '../common/Esqueleto';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';
import { Pulsable } from '../common/Pulsable';

const ANCHO = 148;

type Tarjeta = {
  id: number;
  titulo: string;
  poster: string | null;
  amigos: string[];
  nota?: number;
  pie?: string;
};

const TarjetaPeli = memo(function TarjetaPeli({
  t,
  perfiles,
  onPress,
}: {
  t: Tarjeta;
  perfiles: Record<string, UsuarioPerfil | undefined>;
  onPress: (id: number) => void;
}) {
  const nombres = t.amigos.map((u) => perfiles[u]?.username ?? 'un amigo');
  return (
    <Pulsable
      style={styles.tarjeta}
      onPress={() => onPress(t.id)}
      accessibilityLabel={[t.titulo, t.pie ?? nombres.join(', '), t.nota ? `nota ${t.nota}` : '']
        .filter(Boolean)
        .join('. ')}
    >
      {t.poster ? (
        <Image
          source={{ uri: posterUrl(t.poster, 'w342') ?? undefined }}
          style={styles.poster}
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={String(t.id)}
        />
      ) : (
        <View style={[styles.poster, styles.sinPoster]}>
          <Text style={styles.sinPosterTexto} numberOfLines={4}>
            {t.titulo}
          </Text>
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(2,6,23,0.75)']}
        style={styles.pieCartel}
        pointerEvents="none"
      >
        <View style={styles.amigos}>
          {t.amigos.slice(0, 3).map((u, i) => (
            <Avatar
              key={u}
              uri={perfiles[u]?.fotoPerfil}
              nombre={perfiles[u]?.username}
              tamano={26}
              style={[styles.miniAvatar, i > 0 && { marginLeft: -9 }]}
            />
          ))}
          {t.amigos.length > 3 ? <Text style={styles.mas}>+{t.amigos.length - 3}</Text> : null}
        </View>
      </LinearGradient>
      {t.nota ? (
        <View style={styles.nota}>
          <IconStarFilled size={11} color={COLORS.accent} />
          <Text style={styles.notaTexto}>{t.nota.toFixed(t.nota % 1 ? 1 : 0)}</Text>
        </View>
      ) : null}
    </Pulsable>
  );
});

function Fila({
  titulo,
  tarjetas,
  perfiles,
  onPeli,
}: {
  titulo: string;
  tarjetas: Tarjeta[];
  perfiles: Record<string, UsuarioPerfil | undefined>;
  onPeli: (id: number) => void;
}) {
  if (tarjetas.length === 0) return null;
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.fila}>
      <Text style={styles.filaTitulo}>{titulo}</Text>
      <FlatList
        horizontal
        data={tarjetas}
        keyExtractor={(t) => String(t.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
        renderItem={({ item }) => <TarjetaPeli t={item} perfiles={perfiles} onPress={onPeli} />}
        initialNumToRender={4}
        windowSize={3}
      />
    </Animated.View>
  );
}

const desde = (p: PeliDeAmigos, pie?: string): Tarjeta => ({
  id: p.idPelicula,
  titulo: p.titulo,
  poster: p.rutaPoster,
  amigos: p.amigos,
  nota: p.media,
  pie,
});

export function MuroAmigos({
  muro,
  categorias,
  cargando,
  perfiles,
  onPeli,
}: {
  muro?: Muro;
  categorias: Categoria[];
  cargando: boolean;
  perfiles: Record<string, UsuarioPerfil | undefined>;
  onPeli: (id: number) => void;
}) {
  if (cargando && !muro) {
    return (
      <View style={{ gap: 28, paddingTop: 8 }}>
        <EsqueletoFilaPosters ancho={ANCHO} />
        <EsqueletoFilaPosters ancho={ANCHO} />
      </View>
    );
  }
  if (!muro) return null;
  const vacio = muro.vistasRecientes.length + muro.favoritas.length + muro.porVer.length === 0;
  if (vacio) {
    return (
      <Text style={styles.vacio}>
        Cuando tus amigos vean pelis o las guarden en su Por ver, aparecerán aquí.
      </Text>
    );
  }
  return (
    <View style={{ gap: 32, paddingBottom: 8 }}>
      <Fila
        titulo="Lo último de tus amigos"
        perfiles={perfiles}
        onPeli={onPeli}
        tarjetas={muro.vistasRecientes.map(({ amigo, peli }) => ({
          id: peli.idPelicula,
          titulo: peli.titulo,
          poster: peli.rutaPoster,
          amigos: [amigo],
          nota: peli.valoracion || undefined,
        }))}
      />
      <Fila
        titulo="Les encanta"
        perfiles={perfiles}
        onPeli={onPeli}
        tarjetas={muro.favoritas.map((p) => desde(p))}
      />
      {categorias.map((c) => (
        <Fila
          key={c.genero}
          titulo={c.genero}
          perfiles={perfiles}
          onPeli={onPeli}
          tarjetas={c.pelis.map((p) => desde(p))}
        />
      ))}
      <Fila
        titulo="En su Por ver"
        perfiles={perfiles}
        onPeli={onPeli}
        tarjetas={muro.porVer.map((p) => desde(p))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { gap: 12 },
  filaTitulo: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: FUENTES.titulo,
    paddingHorizontal: 20,
  },
  tarjeta: { width: ANCHO },
  poster: {
    width: ANCHO,
    height: ANCHO * 1.5,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sinPoster: { alignItems: 'center', justifyContent: 'center', padding: 12 },
  sinPosterTexto: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FUENTES.seminegrita,
    textAlign: 'center',
  },
  pieCartel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 28,
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  amigos: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: { borderWidth: 2, borderColor: 'rgba(2,6,23,0.9)' },
  mas: { color: COLORS.text, fontSize: 12, fontFamily: FUENTES.titulo, marginLeft: 6 },
  nota: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(2,6,23,0.75)',
  },
  notaTexto: { color: COLORS.accent, fontSize: 12, fontFamily: FUENTES.titulo },
  vacio: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
    paddingHorizontal: 36,
    paddingTop: 24,
  },
});

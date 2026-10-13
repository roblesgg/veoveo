/**
 * Muro de Social: filas horizontales con lo que ven tus amigos.
 * "Visto últimamente", "Les encanta", una fila por categoría y "En su Por ver".
 */
import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
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

const ANCHO = 116;

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
  const nombres = t.amigos.map((u) => perfiles[u]?.username ?? '…');
  return (
    <Pressable
      style={styles.tarjeta}
      onPress={() => onPress(t.id)}
      accessibilityLabel={`${t.titulo}. ${nombres.join(', ')}`}
    >
      <Image
        source={{ uri: posterUrl(t.poster, 'w342') ?? undefined }}
        style={styles.poster}
        cachePolicy="memory-disk"
        transition={150}
        recyclingKey={String(t.id)}
      />
      <View style={styles.amigos}>
        {t.amigos.slice(0, 3).map((u, i) => (
          <Avatar
            key={u}
            uri={perfiles[u]?.fotoPerfil}
            nombre={perfiles[u]?.username}
            tamano={22}
            style={[styles.miniAvatar, i > 0 && { marginLeft: -8 }]}
          />
        ))}
        {t.nota ? (
          <View style={styles.nota}>
            <IconStarFilled size={11} color={COLORS.accent} />
            <Text style={styles.notaTexto}>{t.nota.toFixed(t.nota % 1 ? 1 : 0)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.titulo} numberOfLines={2}>
        {t.titulo}
      </Text>
      <Text style={styles.pie} numberOfLines={1}>
        {t.pie ?? (nombres.length > 1 ? `${nombres[0]} y ${nombres.length - 1} más` : nombres[0])}
      </Text>
    </Pressable>
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
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
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
    <View style={{ gap: 26, paddingBottom: 8 }}>
      <Fila
        titulo="Visto últimamente por tus amigos"
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
        titulo="A tus amigos les encanta"
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
        titulo="En el Por ver de tus amigos"
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
  tarjeta: { width: ANCHO, gap: 6 },
  poster: { width: ANCHO, height: ANCHO * 1.5, borderRadius: 14, backgroundColor: COLORS.card },
  amigos: { flexDirection: 'row', alignItems: 'center', marginTop: -18, paddingHorizontal: 6 },
  miniAvatar: { borderWidth: 2, borderColor: COLORS.background },
  nota: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(2,6,23,0.85)',
  },
  notaTexto: { color: COLORS.accent, fontSize: 11, fontFamily: FUENTES.titulo },
  titulo: { color: COLORS.text, fontSize: 13, lineHeight: 17, fontFamily: FUENTES.seminegrita },
  pie: { color: COLORS.textMuted, fontSize: 12, fontFamily: FUENTES.texto, marginTop: -2 },
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

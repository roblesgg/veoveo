import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import { LoaderClaqueta } from '../components/common/LoaderClaqueta';
import { EstadoError } from '../components/common/EstadoPantalla';
import type { RootStackParamList } from '../navigation/types';
import {
  desbloquearUsuario,
  obtenerBloqueadosUids,
  obtenerUsuarioPorUid,
} from '../services/repositorioUsuarios';
import { useMontserrat } from '../theme/useMontserrat';

type Fila = { uid: string; username: string };

export function BloqueadosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { fontFamily, loaded } = useMontserrat();
  const ff = fontFamily ?? 'System';

  const [cargando, setCargando] = useState(true);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [error, setError] = useState(false);
  const [quitando, setQuitando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(false);
    try {
      const uids = await obtenerBloqueadosUids();
      const res: Fila[] = [];
      for (const uid of uids) {
        const u = await obtenerUsuarioPorUid(uid);
        res.push({ uid, username: u?.username ?? uid.slice(0, 8) + '…' });
      }
      setFilas(res);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!loaded) {
    return <GradientBackground style={{ paddingTop: insets.top }} />;
  }

  return (
    <GradientBackground style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <Text style={[styles.titulo, { fontFamily: ff }]}>Bloqueados</Text>
      </View>

      {cargando ? (
        <LoaderClaqueta />
      ) : error ? (
        <EstadoError texto="No hemos podido cargar tus bloqueados." onReintentar={cargar} />
      ) : (
        <FlatList
          data={filas}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
          ListEmptyComponent={
            <Text style={[styles.vacio, { fontFamily: ff }]}>No tienes usuarios bloqueados</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nombre, { fontFamily: ff }]}>{item.username}</Text>
                <Text style={styles.uid}>{item.uid}</Text>
              </View>
              <Pressable
                onPress={async () => {
                  setQuitando(item.uid);
                  try {
                    await desbloquearUsuario(item.uid);
                    setFilas((f) => f.filter((x) => x.uid !== item.uid));
                  } finally {
                    setQuitando(null);
                  }
                }}
                disabled={quitando === item.uid}
                style={styles.desbloquear}
              >
                {quitando === item.uid ? (
                  <LoaderClaqueta tamano="pequeno" />
                ) : (
                  <Text style={{ color: '#ff8a80', fontFamily: ff, fontSize: 14 }}>
                    Desbloquear
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        />
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  titulo: { fontSize: 22, color: '#fff', fontWeight: '700' },
  vacio: { color: '#888', textAlign: 'center', marginTop: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  nombre: { color: '#fff', fontSize: 16 },
  uid: { color: '#666', fontSize: 11, marginTop: 4 },
  desbloquear: { padding: 8, minWidth: 100, alignItems: 'flex-end' },
});

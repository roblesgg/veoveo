/**
 * ARCHIVO: screens/SolicitudesScreen.tsx
 * DESCRIPCIÓN: Solicitudes de amistad: las que te han enviado (aceptar o rechazar) y las que
 * has enviado tú y siguen pendientes (cancelar).
 */
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevronLeft, IconFlag, IconUsers } from '@tabler/icons-react-native';
import {
  aceptarSolicitud,
  cancelarSolicitud,
  obtenerSolicitudesEnviadasPendientesUids,
  obtenerSolicitudesPendientes,
  rechazarSolicitud,
} from '../services/repositorioSocial';
import { nombreDe, usePerfiles } from '../hooks/usePerfiles';
import { Avatar } from '../components/common/Avatar';
import { HojaDenuncia } from '../components/common/HojaDenuncia';
import type { SolicitudAmistad } from '../types';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';
import { Pulsable } from '../components/common/Pulsable';

export function SolicitudesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [recibidas, setRecibidas] = useState<SolicitudAmistad[]>([]);
  const [enviadas, setEnviadas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denunciado, setDenunciado] = useState<SolicitudAmistad | null>(null);
  const perfiles = usePerfiles([...recibidas.map((s) => s.deUid), ...enviadas]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [r, e] = await Promise.all([
        obtenerSolicitudesPendientes(),
        obtenerSolicitudesEnviadasPendientesUids(),
      ]);
      setRecibidas(r);
      setEnviadas([...e]);
      setError(null);
    } catch {
      setError('No hemos podido cargar las solicitudes. Revisa la conexión.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const accion = async (clave: string, fn: () => Promise<void>, fallo: string) => {
    setOcupado(clave);
    try {
      await fn();
      await cargar();
    } catch {
      setError(fallo);
    } finally {
      setOcupado(null);
    }
  };

  const vacio = !cargando && recibidas.length === 0 && enviadas.length === 0;

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.cabecera}>
        <Pulsable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Volver">
          <IconChevronLeft size={28} color={COLORS.text} strokeWidth={2} />
        </Pulsable>
        <Text style={styles.titulo}>Solicitudes</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={cargando}
            onRefresh={cargar}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {vacio && (
          <View style={styles.vacio}>
            <IconUsers size={56} color={COLORS.textMuted} strokeWidth={1.5} />
            <Text style={styles.vacioTitulo}>Nada pendiente</Text>
            <Text style={styles.vacioTexto}>
              Aquí verás quién quiere ser tu amigo y las solicitudes que has enviado.
            </Text>
          </View>
        )}

        {recibidas.length > 0 && <Text style={styles.seccion}>Te han enviado</Text>}
        {recibidas.map((s) => (
          <View key={s.id} style={styles.fila}>
            <Avatar uri={perfiles[s.deUid]?.fotoPerfil} nombre={s.deUsername} tamano={44} />
            <Text style={styles.nombre} numberOfLines={1}>
              {perfiles[s.deUid]?.username ?? s.deUsername}
            </Text>
            <Pulsable
              style={[styles.boton, styles.botonSi, ocupado === s.id && styles.apagado]}
              disabled={!!ocupado}
              onPress={() =>
                void accion(
                  s.id,
                  () => aceptarSolicitud(s.id),
                  'No hemos podido aceptar la solicitud.',
                )
              }
            >
              <Text style={styles.botonSiTexto}>Aceptar</Text>
            </Pulsable>
            <Pulsable
              style={[styles.boton, ocupado === s.id && styles.apagado]}
              disabled={!!ocupado}
              onPress={() =>
                void accion(
                  s.id,
                  () => rechazarSolicitud(s.id),
                  'No hemos podido rechazar la solicitud.',
                )
              }
            >
              <Text style={styles.botonTexto}>Rechazar</Text>
            </Pulsable>
            <Pulsable
              onPress={() => setDenunciado(s)}
              hitSlop={8}
              accessibilityLabel={`Denunciar a ${s.deUsername}`}
            >
              <IconFlag size={20} color={COLORS.textMuted} strokeWidth={2} />
            </Pulsable>
          </View>
        ))}

        {enviadas.length > 0 && <Text style={styles.seccion}>Has enviado</Text>}
        {enviadas.map((uid) => (
          <View key={uid} style={styles.fila}>
            <Avatar uri={perfiles[uid]?.fotoPerfil} nombre={perfiles[uid]?.username} tamano={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre} numberOfLines={1}>
                {nombreDe(perfiles[uid], !perfiles[uid])}
              </Text>
              <Text style={styles.pendiente}>Pendiente</Text>
            </View>
            <Pulsable
              style={[styles.boton, ocupado === uid && styles.apagado]}
              disabled={!!ocupado}
              onPress={() =>
                void accion(
                  uid,
                  () => cancelarSolicitud(uid),
                  'No hemos podido cancelar la solicitud.',
                )
              }
            >
              <Text style={styles.botonTexto}>Cancelar</Text>
            </Pulsable>
          </View>
        ))}
      </ScrollView>
      <HojaDenuncia
        objeto={
          denunciado ? { tipo: 'usuario', contra: denunciado.deUid, ref: denunciado.id } : null
        }
        titulo={`Denunciar a ${denunciado?.deUsername ?? ''}`}
        nombreBloqueo={denunciado?.deUsername}
        onCerrar={() => setDenunciado(null)}
        onBloqueado={() => void cargar()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  titulo: { color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo },
  error: {
    color: COLORS.error,
    fontSize: 13,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  seccion: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FUENTES.seminegrita,
    marginTop: 16,
    marginBottom: 4,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  nombre: { flex: 1, color: COLORS.text, fontSize: 16, fontFamily: FUENTES.texto },
  pendiente: { color: COLORS.textMuted, fontSize: 12, fontFamily: FUENTES.texto },
  boton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
  },
  botonTexto: { color: COLORS.text, fontSize: 13, fontFamily: FUENTES.seminegrita },
  botonSi: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  botonSiTexto: { color: COLORS.onAccent, fontSize: 13, fontFamily: FUENTES.titulo },
  apagado: { opacity: 0.4 },
  vacio: { alignItems: 'center', gap: 12, paddingTop: 60, paddingHorizontal: 16 },
  vacioTitulo: { color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo },
  vacioTexto: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
  },
});

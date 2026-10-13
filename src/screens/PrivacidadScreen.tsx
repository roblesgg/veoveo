/**
 * ARCHIVO: screens/PrivacidadScreen.tsx
 * DESCRIPCIÓN: Quién ve tu biblioteca, si tus Vistas salen en Social y en el Match, quién puede
 * enviarte solicitudes y tus bloqueados. La biblioteca y las solicitudes las hacen cumplir las
 * reglas de Firestore; Vistas en Social y Match, la app (docs/seguridad/limitaciones-conocidas.md).
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react-native';
import { useAuth } from '../context/AuthContext';
import { actualizarPrivacidad, observarUsuario } from '../services/repositorioUsuarios';
import { PRIVACIDAD_POR_DEFECTO, type Privacidad } from '../types';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';

type Opcion<T extends string> = { valor: T; texto: string };

function Selector<T extends string>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: Opcion<T>[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  return (
    <View style={styles.selector}>
      {opciones.map((o) => (
        <Pressable
          key={o.valor}
          onPress={() => onCambio(o.valor)}
          style={[styles.opcion, valor === o.valor && styles.opcionOn]}
          accessibilityRole="radio"
          accessibilityState={{ selected: valor === o.valor }}
        >
          <Text style={[styles.opcionTexto, valor === o.valor && styles.opcionTextoOn]}>
            {o.texto}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function PrivacidadScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [privacidad, setPrivacidad] = useState<Privacidad>(PRIVACIDAD_POR_DEFECTO);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      user
        ? observarUsuario(user.uid, (p) =>
            setPrivacidad({ ...PRIVACIDAD_POR_DEFECTO, ...p.privacidad }),
          )
        : undefined,
    [user],
  );

  // Cambio inmediato en pantalla; si falla, se deshace
  const cambiar = (cambios: Partial<Privacidad>) => {
    const antes = privacidad;
    setPrivacidad({ ...privacidad, ...cambios });
    setError(null);
    actualizarPrivacidad(cambios).catch(() => {
      setPrivacidad(antes);
      setError('No se ha guardado el cambio. Revisa la conexión.');
    });
  };

  const interruptor = (valor: boolean, onCambio: (v: boolean) => void, etiqueta: string) => (
    <Switch
      value={valor}
      onValueChange={onCambio}
      trackColor={{ false: '#334155', true: COLORS.primary }}
      thumbColor={valor ? '#fff' : '#94a3b8'}
      accessibilityLabel={etiqueta}
    />
  );

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.cabecera}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Volver">
          <IconChevronLeft size={28} color={COLORS.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.titulo}>Privacidad</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
          gap: 12,
        }}
      >
        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>¿Quién ve tu biblioteca?</Text>
          <Selector
            opciones={[
              { valor: 'amigos', texto: 'Tus amigos' },
              { valor: 'nadie', texto: 'Solo tú' },
            ]}
            valor={privacidad.biblioteca}
            onCambio={(biblioteca) => cambiar({ biblioteca })}
          />
          <Text style={styles.ayuda}>
            {privacidad.biblioteca === 'nadie'
              ? 'Tus amigos no verán tus pelis, ni en tu perfil, ni en Social, ni en el mazo del Match.'
              : 'Tus amigos ven tu Por ver y tus Vistas. Nadie más.'}
          </Text>
        </View>

        <View
          style={[styles.tarjeta, styles.fila, privacidad.biblioteca === 'nadie' && styles.apagado]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.etiqueta}>Tus Vistas en Social</Text>
            <Text style={styles.ayuda}>
              Lo que has visto y tus estrellas salen en el muro de tus amigos.
            </Text>
          </View>
          {interruptor(
            privacidad.vistasEnSocial,
            (vistasEnSocial) => cambiar({ vistasEnSocial }),
            'Tus Vistas en Social',
          )}
        </View>

        <View
          style={[styles.tarjeta, styles.fila, privacidad.biblioteca === 'nadie' && styles.apagado]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.etiqueta}>Tus Vistas en el Movie Match</Text>
            <Text style={styles.ayuda}>
              Las pelis que ya has visto pueden salir en el mazo, por si os apetece repetir.
            </Text>
          </View>
          {interruptor(
            privacidad.vistasEnMatch,
            (vistasEnMatch) => cambiar({ vistasEnMatch }),
            'Tus Vistas en el Movie Match',
          )}
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>¿Quién puede enviarte solicitudes?</Text>
          <Selector
            opciones={[
              { valor: 'todos', texto: 'Cualquiera' },
              { valor: 'nadie', texto: 'Nadie' },
            ]}
            valor={privacidad.solicitudes}
            onCambio={(solicitudes) => cambiar({ solicitudes })}
          />
          <Text style={styles.ayuda}>
            {privacidad.solicitudes === 'nadie'
              ? 'Nadie podrá enviarte solicitudes. Tú sí puedes enviarlas.'
              : 'Cualquiera que sepa tu nombre exacto o tu código de amigo.'}
          </Text>
        </View>

        <Pressable
          style={[styles.tarjeta, styles.fila]}
          onPress={() => navigation.navigate('Bloqueados')}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.etiqueta}>Bloqueados</Text>
            <Text style={styles.ayuda}>
              No pueden escribirte, enviarte solicitudes ni meterte en un Match.
            </Text>
          </View>
          <IconChevronRight size={20} color={COLORS.textMuted} strokeWidth={2} />
        </Pressable>
      </ScrollView>
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
  },
  tarjeta: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  apagado: { opacity: 0.45 },
  etiqueta: { color: COLORS.text, fontSize: 16, fontFamily: FUENTES.titulo },
  ayuda: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FUENTES.texto,
    marginTop: 2,
  },
  selector: { flexDirection: 'row', gap: 8 },
  opcion: {
    flex: 1,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  opcionTexto: { color: COLORS.text, fontSize: 14, fontFamily: FUENTES.texto },
  opcionTextoOn: { color: COLORS.onAccent, fontFamily: FUENTES.titulo },
});

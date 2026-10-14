/**
 * ARCHIVO: screens/CuentaScreen.tsx
 * DESCRIPCIÓN: Tu cuenta: correo y contraseña (si entras con correo), descargar tus datos y
 * borrar la cuenta (obligatorio en Google Play). Las operaciones delicadas piden volver a
 * identificarse (contraseña o Google) justo antes, como exige Firebase.
 */
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useAuth } from '../context/AuthContext';
import { borrarMisDatos, exportarMisDatos, type PasoBorrado } from '../services/cuentaDatos';
import { LoaderClaqueta } from '../components/common/LoaderClaqueta';
import { COLORS } from '../theme/colors';
import { FUENTES } from '../theme/useMontserrat';
import { Pulsable } from '../components/common/Pulsable';

type Panel = null | 'correo' | 'contrasena' | 'borrar';

const TEXTO_PASO: Record<PasoBorrado, string> = {
  amistades: 'Quitando tus amistades…',
  solicitudes: 'Borrando tus solicitudes…',
  chats: 'Saliendo de tus grupos…',
  match: 'Borrando tus votos del Movie Match…',
  biblioteca: 'Borrando tu biblioteca…',
  perfil: 'Borrando tu perfil…',
};

/** Mensaje claro para los errores de Firebase Auth más habituales. */
function explicar(e: unknown): string {
  const codigo = (e as { code?: string })?.code ?? '';
  if (codigo.includes('wrong-password') || codigo.includes('invalid-credential'))
    return 'La contraseña no es correcta.';
  if (codigo.includes('email-already-in-use')) return 'Ese correo ya lo usa otra cuenta.';
  if (codigo.includes('invalid-email')) return 'Ese correo no es válido.';
  if (codigo.includes('weak-password')) return 'La contraseña nueva es demasiado débil.';
  if (codigo.includes('too-many-requests'))
    return 'Demasiados intentos. Espera un poco y vuelve a probar.';
  if (codigo.includes('network')) return 'Sin conexión. Revisa tu red.';
  if ((e as Error)?.message === 'Cancelado') return 'Has cancelado la verificación con Google.';
  return 'No ha salido bien. Vuelve a intentarlo.';
}

export function CuentaScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, reauthenticate, changePassword, changeEmail, deleteAuthUser } = useAuth();
  const conCorreo = !!user?.providerData.some((p) => p.providerId === 'password');

  const [panel, setPanel] = useState<Panel>(null);
  const [actual, setActual] = useState('');
  const [nuevo, setNuevo] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const abrir = (p: Panel) => {
    setPanel(panel === p ? null : p);
    setActual('');
    setNuevo('');
    setConfirmacion('');
    setError(null);
    setAviso(null);
  };

  const ejecutar = async (texto: string, fn: () => Promise<void>) => {
    setOcupado(texto);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(explicar(e));
    } finally {
      setOcupado(null);
    }
  };

  const cambiarCorreo = () =>
    ejecutar('Enviando el enlace…', async () => {
      await reauthenticate(actual);
      await changeEmail(nuevo);
      setPanel(null);
      setAviso(`Te hemos enviado un enlace a ${nuevo.trim()}. El correo cambia cuando lo abras.`);
    });

  const cambiarContrasena = () =>
    ejecutar('Cambiando la contraseña…', async () => {
      await reauthenticate(actual);
      await changePassword(nuevo);
      setPanel(null);
      setAviso('Contraseña cambiada.');
    });

  const descargar = () =>
    ejecutar('Reuniendo tus datos…', async () => {
      const json = await exportarMisDatos();
      await Share.share({ title: 'Mis datos de VeoVeo', message: json });
    });

  const borrar = () =>
    ejecutar('Comprobando que eres tú…', async () => {
      // Primero se reautentica: así Auth deja borrar el usuario al final y no queda a medias
      await reauthenticate(conCorreo ? actual : undefined);
      await borrarMisDatos((paso) => setOcupado(TEXTO_PASO[paso]));
      setOcupado('Cerrando tu cuenta…');
      await deleteAuthUser();
      // Sin usuario, la navegación vuelve sola a la pantalla de inicio de sesión
    });

  if (ocupado) {
    return (
      <View style={[styles.flex, styles.centro]}>
        <LoaderClaqueta texto={ocupado} />
      </View>
    );
  }

  const campo = (
    valor: string,
    onCambio: (v: string) => void,
    placeholder: string,
    secreto = false,
  ) => (
    <TextInput
      value={valor}
      onChangeText={onCambio}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      secureTextEntry={secreto}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType={!secreto && placeholder.includes('correo') ? 'email-address' : 'default'}
      style={styles.campo}
    />
  );

  const boton = (texto: string, onPress: () => void, activo: boolean, peligro = false) => (
    <Pulsable
      onPress={onPress}
      disabled={!activo}
      style={[styles.boton, peligro && styles.botonPeligro, !activo && { opacity: 0.4 }]}
    >
      <Text style={[styles.botonTexto, peligro && { color: COLORS.text }]}>{texto}</Text>
    </Pulsable>
  );

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.cabecera}>
        <Pulsable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Volver">
          <IconChevronLeft size={28} color={COLORS.text} strokeWidth={2} />
        </Pulsable>
        <Text style={styles.titulo}>Cuenta</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {aviso && <Text style={styles.aviso}>{aviso}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>Correo</Text>
          <Text style={styles.valor}>{user?.email ?? '—'}</Text>
          {conCorreo ? (
            <>
              <Pulsable onPress={() => abrir('correo')}>
                <Text style={styles.enlace}>Cambiar correo</Text>
              </Pulsable>
              {panel === 'correo' && (
                <View style={styles.panel}>
                  {campo(nuevo, setNuevo, 'Nuevo correo')}
                  {campo(actual, setActual, 'Tu contraseña actual', true)}
                  {boton(
                    'Enviar enlace',
                    () => void cambiarCorreo(),
                    nuevo.includes('@') && actual.length > 0,
                  )}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.ayuda}>
              Entras con Google: el correo y la contraseña se gestionan en tu cuenta de Google.
            </Text>
          )}
        </View>

        {conCorreo && (
          <View style={styles.tarjeta}>
            <Pulsable onPress={() => abrir('contrasena')}>
              <Text style={styles.etiqueta}>Cambiar contraseña</Text>
            </Pulsable>
            {panel === 'contrasena' && (
              <View style={styles.panel}>
                {campo(actual, setActual, 'Contraseña actual', true)}
                {campo(nuevo, setNuevo, 'Contraseña nueva (8 caracteres o más)', true)}
                {boton(
                  'Cambiar',
                  () => void cambiarContrasena(),
                  actual.length > 0 && nuevo.length >= 8,
                )}
              </View>
            )}
          </View>
        )}

        <Pulsable style={styles.tarjeta} onPress={() => void descargar()}>
          <Text style={styles.etiqueta}>Descargar mis datos</Text>
          <Text style={styles.ayuda}>
            Tu perfil, tu biblioteca, tus amistades, tus mensajes y tus votos en un archivo de texto
            (JSON) que puedes guardar o enviarte.
          </Text>
        </Pulsable>

        <View style={[styles.tarjeta, styles.tarjetaPeligro]}>
          <Pulsable onPress={() => abrir('borrar')}>
            <Text style={[styles.etiqueta, { color: COLORS.error }]}>Borrar mi cuenta</Text>
          </Pulsable>
          {panel === 'borrar' && (
            <View style={styles.panel}>
              <Text style={styles.ayuda}>
                Se borran tu perfil, tu correo, tu biblioteca, tus amistades, tus solicitudes y tus
                votos del Movie Match. Sales de tus grupos. Tus mensajes se quedan en los chats de
                los demás, firmados como «Usuario eliminado». No se puede deshacer.
              </Text>
              {conCorreo && campo(actual, setActual, 'Tu contraseña', true)}
              {campo(confirmacion, setConfirmacion, 'Escribe BORRAR para confirmar')}
              {boton(
                conCorreo ? 'Borrar mi cuenta' : 'Verificar con Google y borrar',
                () => void borrar(),
                confirmacion.trim().toUpperCase() === 'BORRAR' && (!conCorreo || actual.length > 0),
                true,
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  centro: { alignItems: 'center', justifyContent: 'center' },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  titulo: { color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo },
  tarjeta: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  tarjetaPeligro: { borderColor: 'rgba(239,68,68,0.35)' },
  etiqueta: { color: COLORS.text, fontSize: 16, fontFamily: FUENTES.titulo },
  valor: { color: COLORS.text, fontSize: 15, fontFamily: FUENTES.texto },
  ayuda: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, fontFamily: FUENTES.texto },
  enlace: { color: COLORS.primary, fontSize: 14, fontFamily: FUENTES.seminegrita },
  panel: { gap: 10, marginTop: 4 },
  campo: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 15,
    fontFamily: FUENTES.texto,
  },
  boton: {
    height: 48,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPeligro: { backgroundColor: COLORS.error },
  botonTexto: { color: COLORS.onAccent, fontSize: 15, fontFamily: FUENTES.titulo },
  aviso: { color: COLORS.accent, fontSize: 14, lineHeight: 20, fontFamily: FUENTES.texto },
  error: { color: COLORS.error, fontSize: 14, lineHeight: 20, fontFamily: FUENTES.texto },
});

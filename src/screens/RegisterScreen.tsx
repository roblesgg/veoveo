/**
 * ARCHIVO: screens/RegisterScreen.tsx
 * DESCRIPCIÓN: Pantalla de registro de nuevos usuarios.
 * Gestiona el alta mediante Email y Contraseña, validando la coincidencia
 * de campos y la longitud mínima de seguridad.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { GradientBackground } from '../components/GradientBackground';
import { AvisoLegal } from '../components/common/AvisoLegal';
import type { RootStackParamList } from '../navigation/types';
import { COLORS } from '../theme/colors';
import { SHADOWS } from '../theme/theme';
import { useMontserrat } from '../theme/useMontserrat';
import { Cargando } from '../components/common/Cargando';
import { BotonPrincipal } from '../components/common/Botones';
import { CampoTexto } from '../components/common/Campos';
import { Pulsable } from '../components/common/Pulsable';

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  // HOOK DE AUTENTICACIÓN: Acceso al método 'register' de Firebase
  const { register, firebaseReady } = useAuth();
  const { fontFamily: ff_base, loaded } = useMontserrat();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const ff = loaded ? 'Montserrat_600SemiBold' : 'System';

  return (
    <GradientBackground style={[styles.center, { paddingTop: insets.top }]}>
      <View style={styles.pad}>
        <Text style={[styles.title, { fontFamily: ff }]}>Crear Cuenta</Text>

        {!firebaseReady ? (
          <Text style={styles.warn}>Firebase no configurado (variables de entorno).</Text>
        ) : null}

        {/* INPUTS DE REGISTRO */}
        <CampoTexto
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          underlineColorAndroid="transparent"
          keyboardType="email-address"
          autoCapitalize="none"
          estilo={[styles.input, SHADOWS.macLight]}
        />
        <CampoTexto
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          underlineColorAndroid="transparent"
          secureTextEntry
          estilo={[styles.input, SHADOWS.macLight]}
        />
        <CampoTexto
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Confirmar contraseña"
          underlineColorAndroid="transparent"
          secureTextEntry
          estilo={[styles.input, SHADOWS.macLight]}
        />

        {/* FEEDBACK DE ERRORES */}
        {errorMessage ? <Text style={[styles.err, { fontFamily: ff }]}>{errorMessage}</Text> : null}
        {loading ? (
          <View style={{ marginBottom: 16 }}>
            <Cargando tamano="mediano" />
          </View>
        ) : null}

        {/* BOTÓN: EJECUTAR REGISTRO */}
        <BotonPrincipal
          texto="REGISTRARSE"
          desactivado={loading || !firebaseReady}
          onPress={async () => {
            setErrorMessage('');

            // Validaciones previas al envío
            if (password.length < 6) {
              setErrorMessage('La contraseña debe tener al menos 6 caracteres');
              return;
            }
            if (password !== confirm) {
              setErrorMessage('Las contraseñas no coinciden');
              return;
            }

            setLoading(true);
            try {
              // El método register también crea el perfil inicial en Firestore
              await register(email, password);
            } catch (e) {
              setErrorMessage(e instanceof Error ? e.message : 'Error al crear cuenta');
            } finally {
              setLoading(false);
            }
          }}
        />
        <AvisoLegal fontFamily={ff} />

        {/* LINK VOLVER A LOGIN */}
        <Pulsable onPress={() => navigation.navigate('Login')} style={{ marginTop: 16 }}>
          <Text style={[styles.link, { fontFamily: ff }]}>¿Ya tienes cuenta? Inicia sesión</Text>
        </Pulsable>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pad: {
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 420,
  },
  title: { fontSize: 40, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 28 },
  warn: { color: '#ffcc80', marginBottom: 12, textAlign: 'center', fontSize: 13 },
  input: { marginBottom: 16 },
  err: { color: COLORS.error, marginBottom: 16, textAlign: 'center', fontSize: 14 },
  link: { color: '#fff', textAlign: 'center' },
});

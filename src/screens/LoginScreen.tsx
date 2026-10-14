/**
 * ARCHIVO: screens/LoginScreen.tsx
 * DESCRIPCIÓN: Pantalla de inicio de sesión.
 * Permite acceso mediante Email/Contraseña o Google Sign-In (Firebase).
 * Gestiona errores de configuración de Firebase y recuperación de contraseña.
 */

import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { GradientBackground } from '../components/GradientBackground';
import type { RootStackParamList } from '../navigation/types';
import { COLORS } from '../theme/colors';
import { SHADOWS } from '../theme/theme';
import { useMontserrat } from '../theme/useMontserrat';
import { AlertModal } from '../components/common/AlertModal';
import { AvisoLegal } from '../components/common/AvisoLegal';
import { LoaderClaqueta } from '../components/common/LoaderClaqueta';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  // HOOK DE AUTENTICACIÓN: Provee los métodos de Firebase centralizados
  const { login, signInWithGoogle, firebaseReady, resetPassword } = useAuth();
  const { fontFamily: ff_base, loaded } = useMontserrat();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: any;
    color?: string;
  } | null>(null);

  // Fallback de fuente si aún no ha cargado
  const ff = loaded ? 'Montserrat_600SemiBold' : 'System';

  return (
    <GradientBackground style={[styles.center, { paddingTop: insets.top }]}>
      <View style={styles.pad}>
        {/* LOGO PRINCIPAL */}
        <Text style={[styles.logo, { fontFamily: ff }]}>VeoVeo</Text>

        {/* COMPRESIÓN DE ERRORES DE ENTORNO (Solo desarrollo) */}
        {!firebaseReady ? (
          <Text style={styles.warn}>
            Configura las variables EXPO_PUBLIC_FIREBASE_* en un archivo .env
          </Text>
        ) : null}

        {/* INPUTS DE ACCESO */}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#888"
          underlineColorAndroid="transparent"
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, SHADOWS.macLight, { fontFamily: ff }]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor="#888"
          underlineColorAndroid="transparent"
          secureTextEntry
          style={[styles.input, SHADOWS.macLight, { fontFamily: ff }]}
        />

        {/* MENSAJES DE ERROR DINÁMICOS */}
        {errorMessage ? <Text style={[styles.err, { fontFamily: ff }]}>{errorMessage}</Text> : null}

        {loading ? (
          <View style={{ marginBottom: 16 }}>
            <LoaderClaqueta tamano="mediano" />
          </View>
        ) : null}

        {/* BOTÓN: ACCESO TRADICIONAL */}
        <Pressable
          style={[styles.btn, styles.btnDark, SHADOWS.macLight]}
          disabled={loading || !firebaseReady}
          onPress={async () => {
            setErrorMessage('');
            setLoading(true);
            try {
              // Solo en el APK de pruebas: «alvaro» vale por alvaro@veoveo-pruebas.test
              const esPruebas = Constants.expoConfig?.name === 'VeoVeo Test';
              const correo =
                esPruebas && !email.includes('@') ? `${email.trim()}@veoveo-pruebas.test` : email;
              await login(correo, password);
            } catch (e) {
              setErrorMessage(e instanceof Error ? e.message : 'Error al iniciar sesión');
            } finally {
              setLoading(false);
            }
          }}
        >
          <Text style={[styles.btnText, { fontFamily: ff }]}>INICIAR SESIÓN</Text>
        </Pressable>

        {/* BOTÓN: ACCESO CON GOOGLE */}
        <Pressable
          style={[styles.btn, styles.btnLight, SHADOWS.macLight]}
          disabled={loading || !firebaseReady}
          onPress={async () => {
            setErrorMessage('');
            setLoading(true);
            try {
              await signInWithGoogle();
            } catch (e) {
              const err = e as any;
              let msg = err?.message || 'Error con Google';
              // Guía específica para errores de dominio en Web
              if (msg.includes('unauthorized-domain')) {
                msg = '⚠️ Dominio no autorizado en Firebase Console.';
              }
              setErrorMessage(msg);
            } finally {
              setLoading(false);
            }
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ marginRight: 10 }}>
              {/* Google Logo dinámico (DIV para Web, Icono para Nativo) */}
              {Platform.OS === 'web' ? (
                <div style={{ width: 18, height: 18 }}>
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
              ) : (
                <Ionicons name="logo-google" size={18} color="#000" />
              )}
            </View>
            <Text style={[styles.btnTextDark, { fontFamily: ff }]}>Continuar con Google</Text>
          </View>
        </Pressable>
        <AvisoLegal fontFamily={ff} inicio="Al continuar" />

        {/* NAVEGACIÓN A REGISTRO */}
        <Pressable onPress={() => navigation.navigate('Register')} style={{ marginTop: 16 }}>
          <Text style={[styles.link, { fontFamily: ff }]}>¿No tienes cuenta? Regístrate</Text>
        </Pressable>

        {/* OLVIDO DE CONTRASEÑA */}
        <Pressable
          onPress={async () => {
            if (!email.trim()) {
              setAlertInfo({
                visible: true,
                title: 'Restablecer contraseña',
                message: 'Por favor, introduce tu email arriba primero.',
                icon: 'mail-outline',
                color: COLORS.primary,
              });
              return;
            }
            try {
              setLoading(true);
              await resetPassword(email);
              setAlertInfo({
                visible: true,
                title: 'Éxito',
                message: 'Se ha enviado un correo para restablecer tu contraseña.',
                icon: 'checkmark-circle-outline',
                color: '#4CAF50',
              });
            } catch (e) {
              setErrorMessage(e instanceof Error ? e.message : 'Error al enviar correo');
            } finally {
              setLoading(false);
            }
          }}
          style={{ marginTop: 12 }}
        >
          <Text style={[styles.link, { fontFamily: ff, opacity: 0.7, fontSize: 13 }]}>
            ¿Has olvidado tu contraseña?
          </Text>
        </Pressable>

        <Text style={[styles.version, { fontFamily: ff }]}>v{Constants.expoConfig?.version}</Text>

        <Pressable onPress={() => Linking.openURL('https://dripdev.dev')} style={{ marginTop: 8 }}>
          <Text style={[styles.dripLink, { fontFamily: ff }]}>by DripDev</Text>
        </Pressable>
      </View>

      {/* MODAL DE ALERTA PERSONALIZADO */}
      {alertInfo && (
        <AlertModal
          visible={alertInfo.visible}
          onClose={() => setAlertInfo(null)}
          title={alertInfo.title}
          message={alertInfo.message}
          iconName={alertInfo.icon}
          iconColor={alertInfo.color}
          fontFamily={ff}
        />
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pad: {
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 420,
  },
  logo: { fontSize: 48, color: '#fff', textAlign: 'center', marginBottom: 40 },
  warn: { color: '#ffcc80', marginBottom: 16, textAlign: 'center', fontSize: 13 },
  input: {
    borderRadius: 24,
    backgroundColor: '#1e1e2d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 20,
    height: 52,
    color: '#fff',
    marginBottom: 16,
  },
  err: { color: COLORS.error, marginBottom: 16, textAlign: 'center', fontSize: 14 },
  btn: {
    height: 50,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnDark: { backgroundColor: '#000' },
  btnLight: { backgroundColor: '#fff' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnTextDark: { color: '#000', fontWeight: '700' },
  link: { color: '#fff', textAlign: 'center' },
  version: { color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 32, fontSize: 12 },
  dripLink: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
});

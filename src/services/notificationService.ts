/**
 * ARCHIVO: services/notificationService.ts
 * DESCRIPCION: Gestiona el sistema de notificaciones push de la aplicacion utilizando Expo Notifications.
 * Incluye el registro del dispositivo, obtencion de tokens y envio de notificaciones entre usuarios.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestoreDb } from './firebase';

export const DEFAULT_NOTIFICATION_CHANNEL_ID = 'default';

/**
 * CONFIGURACION GLOBAL: Comportamiento cuando llega una notificacion.
 * Aqui definimos que siempre se muestre la alerta, suene y actualice el badge.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function ensureNotificationChannelConfigured() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(DEFAULT_NOTIFICATION_CHANNEL_ID, {
    name: 'Actualizaciones y avisos',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0EA5E9',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
  });
}

/** ID del proyecto de Expo, necesario para pedir el token de notificaciones. */
export const EXPO_PROJECT_ID: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;

/**
 * Devuelve el token de Expo Push si el usuario YA ha dado permiso de notificaciones.
 * No pide el permiso: de eso se encarga solo NotificationPermissionPrompt, una vez.
 */
export async function obtenerTokenSiHayPermiso(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
    await ensureNotificationChannelConfigured();
    const token = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
    return token.data;
  } catch {
    return null;
  }
}

/**
 * Envia una notificacion push directamente a la API de Expo.
 * @param expoPushToken El token del destinatario.
 * @param title Titulo del mensaje.
 * @param body Cuerpo del mensaje.
 * @param data Datos extra para manejar navegacion al pulsar la notificacion.
 */
export async function enviarNotificacionPush(
  expoPushToken: string,
  title: string,
  body: string,
  data?: any,
) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    priority: 'high' as const,
    channelId: DEFAULT_NOTIFICATION_CHANNEL_ID,
    title,
    body,
    data: data || {},
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (e) {
    console.error('Error enviando push:', e);
  }
}

/**
 * BUSCA Y NOTIFICA:
 * Recupera automaticamente el token de un usuario desde Firestore y le envia el mensaje.
 * @param uid UID del destinatario.
 */
export async function notificarAUsuario(uid: string, title: string, body: string, data?: any) {
  const db = getFirestoreDb();
  if (!db) return;

  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (snap.exists()) {
    const userData = snap.data();
    if (userData.pushToken) {
      await enviarNotificacionPush(userData.pushToken, title, body, data);
    }
  }
}

# Avisos push en Android (FCM)

Hasta el 14-10-2026 el proyecto **nunca tuvo `google-services.json`**: sin él, Android no consigue
token de avisos de Expo y los avisos remotos (mensajes, Match) no llegan. Para que lleguen hacen
falta tres piezas por cada variante de la app:

| Pieza | Pruebas (`com.roblesgg.veoveo.test`) | Producción (`com.roblesgg.veoveo`) |
|---|---|---|
| 1. App Android registrada en Firebase y su `google-services.json` | Hecho: `veoveo-pruebas`, `google-services.pruebas.json` | Pendiente (cambio en producción: OK de Álvaro) |
| 2. `googleServicesFile` en `app.config.js` | Hecho | Se activa solo al poner `google-services.json` en la raíz |
| 3. Credencial FCM V1 subida a Expo (para que Expo pueda enviar) | Pendiente (sesión de Expo de Álvaro) | Pendiente (ídem) |

`google-services*.json` solo lleva identificadores públicos de cliente y va en el repo. La clave
de la cuenta de servicio del paso 3 **sí es secreta**: va a `DripDev/_copias/veoveo/`, nunca al repo
ni a un chat, y se borra de ahí cuando esté subida a Expo.

## Paso 3, para Álvaro (una vez por proyecto: primero pruebas, luego producción)

**A. La clave de la cuenta de servicio (Firebase)**
1. https://console.firebase.google.com/project/veoveo-pruebas/settings/serviceaccounts/adminsdk
   (con la cuenta `dripdev.dev@gmail.com`; arriba tiene que poner «VeoVeo Pruebas»).
2. «Generar nueva clave privada» → «Generar clave». Se descarga un `.json`.
3. Moverlo a `C:\Users\roble\Documents\DripDev\_copias\veoveo\` y avisar al agente con el nombre del archivo.

**B. Subirla a Expo** (en una terminal, dentro de `proyectos\veoveo`)
1. `npx eas-cli login` con la cuenta de Expo del proyecto (owner `drip-dev`).
2. Para pruebas: `$env:APP_ENV='test'; npx eas-cli credentials -p android`
   (para producción, lo mismo sin `APP_ENV`).
3. Elegir: perfil de compilación cualquiera → **Google Service Account** →
   **Manage your Google Service Account Key for Push Notifications (FCM V1)** →
   **Set up a Google Service Account Key for Push Notifications (FCM V1)** →
   **Upload a new service account key** → elegir el `.json` de `_copias`.
4. Avisar al agente. Él borra la clave de `_copias` (ya está guardada en Expo), recompila el APK
   de pruebas y comprueba con el script `actuar.mjs` que el aviso llega al móvil.

Para producción, antes del paso 3, el agente registra la app `com.roblesgg.veoveo` en
`veoveo-48667` (con OK de Álvaro), pone su `google-services.json` en la raíz y la clave se genera en
https://console.firebase.google.com/project/veoveo-48667/settings/serviceaccounts/adminsdk.

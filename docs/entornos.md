# Entornos de VeoVeo

Hay dos proyectos de Firebase y nunca se mezclan.

| | Producción | Pruebas |
|---|---|---|
| Proyecto Firebase | `veoveo-48667` | `veoveo-pruebas` |
| Plan | Spark | Spark (sin facturación) |
| Región de Firestore | `eur3` (UE) | `nam5` (EE. UU.; solo datos inventados) |
| App | **VeoVeo** (Google Play), `com.roblesgg.veoveo` | **VeoVeo Test** (APK), `com.roblesgg.veoveo.test` |
| Configuración web | `.env` | `.env.pruebas.local` (no se sube) |
| Cuentas | Las de los usuarios | Ana, Beto y Carla (`*@veoveo-pruebas.test`); contraseñas en `DripDev/_copias/veoveo/cuentas-pruebas.txt` |

## Regla

**El APK de pruebas no toca producción.** Lo garantizan dos candados:

1. `app.config.js`: con `APP_ENV=test` carga `.env.pruebas.local` y **falla** si el proyecto no es
   `veoveo-pruebas`. Sin `APP_ENV=test`, falla si alguien ha dejado las variables de pruebas.
2. `scripts/pruebas/compilar-apk.ps1`: compila el APK y **comprueba el bundle**: tiene que llevar
   `veoveo-pruebas` y no puede llevar `veoveo-48667`.

## Tareas

| Para… | Hacer |
|---|---|
| Compilar el APK de pruebas | `powershell -File scripts/pruebas/compilar-apk.ps1` |
| Instalarlo en el móvil de Álvaro | `adb install -r <apk>` y nada más (ver la norma del móvil personal) |
| Crear cuentas y datos de ejemplo | `node scripts/pruebas/preparar.mjs` (necesita `firebase login`; no repite datos si ya existen) |
| Desplegar reglas e índices en pruebas | `firebase deploy --only firestore --project veoveo-pruebas` |
| Probar las reglas sin Firebase | `npm run test:reglas` (emulador) |

**Siempre `--project veoveo-pruebas` de forma explícita.** El proyecto activo de la CLI de
Firebase (y del MCP) es producción: un `firebase deploy` sin `--project` va a producción, y eso
necesita el OK de Álvaro.

## Datos de ejemplo

`scripts/pruebas/preparar.mjs` deja:
- Ana, Beto y Carla con biblioteca (8 vistas con nota y 5 por ver cada uno), frase y privacidad por defecto;
- amistades Ana–Beto y Ana–Carla, y una solicitud pendiente de Carla a Beto;
- un chat Ana–Beto con una peli compartida;
- el grupo «Cine del finde» (administra Ana) con un **Movie Match a medias**: Beto y Carla ya han
  votado; si Ana dice «sí» a *Dune: Parte dos*, *El truco final* y *Cadena perpetua*, se llega a 3
  coincidencias y termina.

## Límites del entorno de pruebas

- **Entrar con Google no funciona en el APK de pruebas:** el cliente de Google es el de producción.
  Se entra con correo y contraseña.
- Los avisos push sí llegan (Expo no depende del proyecto de Firebase).
- Si hay que empezar de cero: borrar las 3 cuentas y los datos en la consola de `veoveo-pruebas` y
  volver a lanzar `preparar.mjs`.

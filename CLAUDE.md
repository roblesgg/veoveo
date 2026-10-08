# VeoVeo · Contexto para agentes

> Léelo entero antes de tocar nada. Después lee el encargo vigente en `docs/encargos/`.

## Quién manda aquí

- **Dueño:** Álvaro Robles (DripDev). Háblale en español de España, de tú, claro y directo.
- **Jefe de proyectos:** otra sesión de Claude Code que coordina todos los proyectos de DripDev. Escribe los encargos (`docs/encargos/`) y revisa tu trabajo al cerrarlos.
- **Tú:** el agente que desarrolla VeoVeo. Haces lo que dice el encargo vigente. Si algo no está claro o choca con este documento, **para y pregunta**.

Contexto general de la marca, el dominio y las normas de DripDev: `C:\Users\roble\Documents\DripDev\_marca\drip-garage-recursos\CONTEXTO-IA.md`. Identidad visual de VeoVeo: `…\_marca\drip-garage-recursos\manual-productos\veoveo.md`.

## Qué es VeoVeo

App para **descubrir películas** (solo películas, no series), llevar tu lista de Por ver y Vistas con valoraciones, hacer tier lists, hablar con amigos y elegir peli en grupo con el **Movie Match**. Android (APK) y web en `veoveo.dripdev.dev`. **Objetivo actual: publicarla en Google Play.**

## Stack

Expo SDK 54 · React Native 0.81 · React 19 · TypeScript · React Navigation 7 · TanStack Query · Firebase (Auth, Firestore, Storage) · TMDB API v3 · Expo Notifications y Updates · EAS Build · Vercel para la web.

- Paquete Android: `com.roblesgg.veoveo`. Versión de pruebas: `com.roblesgg.veoveo.test`.
- Firebase: proyecto `veoveo-48667`. Datos: `usuarios/{uid}` (con las subcolecciones `peliculas`, `perfil` y `tierLists`), `chats`, `matches`, `solicitudes_amistad` y `configuracion/app`.
- Arquitectura, publicación y problemas típicos: `README.md`, `docs/INFORME_OPERATIVO_VEOVEO.txt` y `manual_del_dev/`.

## Reglas que no se rompen

1. **Prueba siempre en la versión de pruebas** (`npm run android:test`) antes de tocar la estable. Hay usuarios reales.
2. **Orden de publicación:** primero el APK o AAB publicado, **después** `npm run release` (versión mínima en Firestore). Al revés, los usuarios se quedan en un bucle de actualización.
3. **Datos reales de usuarios:** nada de scripts que borren o modifiquen datos en producción sin el visto bueno de Álvaro. Cambios en las reglas de Firestore o Storage: enséñaselos antes de desplegarlos.
4. **Sin secretos en git:** `.env` en local; los nombres van en `.env.example`. Nada de claves en `eas.json`.
5. **Dominio:** la dirección pública es siempre `veoveo.dripdev.dev`. Nunca enlaces a `*.vercel.app` ni a `*.netlify.app`.
6. **Coste cero:** Firebase en plan gratuito (Spark). Sin Cloud Functions de pago ni servicios de pago por uso sin preguntar.
7. **No toques otros proyectos** ni carpetas fuera de `veoveo/`. Hay otros agentes trabajando en paralelo.
8. **Cambios sin commit que no son tuyos** (por ejemplo, en `public/`): pregunta a Álvaro antes de tocarlos o subirlos.

## Cómo se trabaja

- **Ramas:** `main` es lo que está publicado. Trabaja en `play/<tema>` y fusiona cuando esté probado.
- **Commits:** en español, una línea que diga qué cambia. Identidad: `Alvaro DripDev <Alvaro@dripdev.dev>`.
- **Antes de decir "hecho":** `npm run typecheck` y `npm run lint` en verde, y probado en el móvil con `android:test`.
- **Git LFS:** el repositorio usa LFS para los `.apk`. Si `git push` falla con *"fork: Resource temporarily unavailable"* en el hook, no te lo saltes: pide a Álvaro que haga el push desde su terminal.
- **Al cerrar un encargo:** rellena su "Informe de cierre" y actualiza el README (apartado "Camino a Google Play").

## Cómo hablar con Álvaro

Explica en sencillo qué has hecho y qué falta. Si algo es una suposición, dilo. Si encuentras algo que contradice el encargo, anótalo y pregunta en lugar de improvisar.

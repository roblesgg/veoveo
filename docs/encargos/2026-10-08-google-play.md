# Encargo · VeoVeo · Preparar la publicación en Google Play

> **De:** jefe de proyectos (DripDev) · **Para:** agente de desarrollo de VeoVeo · **Fecha:** 8 de octubre de 2026
> **Estado:** 🔵 Abierto · **Versión objetivo:** 2.1.0 (versionCode 41 o el siguiente que toque)

## Antes de empezar

1. Lee `CLAUDE.md`. Sus reglas son obligatorias.
2. Lee el apartado **"Camino a Google Play"** del `README.md`: es la lista de pendientes que sale de la revisión del código.
3. Pregúntale a Álvaro:
   - si ya tiene **cuenta de desarrollador de Google Play** (pago único de 25 USD). Si no, el bloque D se queda en preparación;
   - qué son los cambios sin commit de `public/descargar.html` y `public/index.html`, y si se conservan.

## Objetivo

Que VeoVeo cumpla todo lo que Google Play exige y que la versión 2.1.0 quede **lista para subir a la pista de pruebas internas** de Google Play: un AAB firmado, la ficha redactada y los formularios preparados.

## Tareas

Se hacen en este orden: primero lo que bloquea la publicación.

### A. Lo que bloquea la publicación

**A1. Borrar la cuenta desde la app** (obligatorio en Google Play para toda app con registro)
- En **Ajustes → Eliminar cuenta**: un aviso claro de qué se borra y un paso de confirmación. Si Firebase lo pide, vuelve a autenticar al usuario.
- Tiene que borrar todo lo del usuario:
  - `usuarios/{uid}` con sus subcolecciones `peliculas`, `perfil` y `tierLists`;
  - su foto en Storage;
  - sus solicitudes de amistad;
  - su `uid` de las listas de amigos de los demás;
  - sus matches y su participación en chats (decide si los mensajes se borran o se anonimizan como "Usuario eliminado" y **pregúntaselo a Álvaro**);
  - por último, la cuenta de Firebase Auth.
- Todo desde el cliente con reglas de seguridad, **sin Cloud Functions de pago**. Si algo no se puede hacer así, para y avisa.
- Además, una **página web** en `veoveo.dripdev.dev/borrar-cuenta` que explique cómo pedir el borrado sin la app, escribiendo a `Alvaro@dripdev.dev`. Google Play pide esta URL.
- ✅ **Hecho cuando:** en `android:test`, una cuenta de prueba con amigos, listas, chats y matches se borra y no queda ningún dato suyo en Firestore, Storage ni Auth. Compruébalo en la consola de Firebase.
- 🛑 **Punto de control:** enseña a Álvaro los cambios en las reglas de Firestore y Storage **antes** de desplegarlos.

**A2. Política de privacidad**
- Una página en `veoveo.dripdev.dev/privacidad`, en español y en inglés: qué datos se guardan y para qué (usa la tabla "Tus datos" del README), quién es el responsable (Álvaro Robles, `Alvaro@dripdev.dev`), servicios de terceros (Firebase, TMDB, Expo Push), cómo borrar la cuenta y contacto.
- Enlazada desde **Ajustes** y desde la pantalla de registro.
- ✅ **Hecho cuando:** las dos URL (`/privacidad` y `/borrar-cuenta`) responden en producción y se ven bien en el móvil.

**A3. Actualizar solo desde Google Play**
- Google Play no permite que una app se actualice fuera de la tienda. Añade una variable de compilación, por ejemplo `EXPO_PUBLIC_DISTRIBUTION=play|apk`, definida en los perfiles de `eas.json`.
  - En la versión **Play**, el aviso de versión mínima (VersionShield) abre la ficha de Play (`market://details?id=com.roblesgg.veoveo`, con `https://play.google.com/store/apps/details?id=com.roblesgg.veoveo` como alternativa) y **nunca** descarga un APK.
  - En la versión **APK**, todo sigue igual que ahora.
- Revisa que las actualizaciones OTA de `expo-updates` solo cambian JavaScript y recursos, nunca código nativo, y anótalo en el informe.
- ✅ **Hecho cuando:** con una versión mínima de prueba, la compilación Play abre Google Play y la APK abre la web de descarga.

**A4. Denunciar contenido** (obligatorio en Google Play para apps con contenido de usuarios, como el chat)
- Opción **Denunciar** en el perfil de otro usuario y en los mensajes del chat. Se guarda en una colección `denuncias` (quién, a quién, qué, motivo y fecha) que solo el usuario puede crear y nadie puede leer desde la app.
- Bloquear ya existe: comprueba que bloquear oculta al usuario en el chat, en Movie Match y en las búsquedas.
- ✅ **Hecho cuando:** una denuncia de prueba aparece en Firestore y un usuario bloqueado deja de aparecer en esos tres sitios.

### B. Revisar antes de enviar

- **B1. Permisos:** quita `SYSTEM_ALERT_WINDOW` y `READ_EXTERNAL_STORAGE` mediante `android.blockedPermissions` en `app.json`, porque el manifiesto se regenera. Comprueba en el AAB final que no aparecen.
- **B2. Enlaces:** quita `https://veoveo-app.netlify.app` de los prefijos de `RootNavigator.tsx`. Anota qué otros dominios sobran.
- **B3. Firma de Google Play:**
  - Prepara lo necesario para añadir en Firebase y en el cliente OAuth de Google la **huella SHA-1 y SHA-256 de la firma de Google Play**, sin la cual el inicio de sesión con Google falla en la versión de la tienda.
  - Prepara también `.well-known/assetlinks.json` con esa huella SHA-256.
  - Las huellas solo existen cuando Álvaro sube el primer AAB. Deja los pasos escritos en `docs/play-store/firma.md`.
- **B4. Atribución de TMDB:** en **Ajustes → Acerca de**, el logo de TMDB y la frase *"Este producto usa la API de TMDB, pero no está respaldado ni certificado por TMDB"*. Revisa los términos de uso de la API de TMDB para una app gratuita en tienda y resume lo que importa en `docs/play-store/tmdb.md`.
- **B5. Icono:** el actual lleva la marca de agua *"Contenido generado por IA"*. **No lo generes tú**: pide a Álvaro una versión limpia y, cuando la tengas, prepara el icono adaptativo y el de 512 px de la ficha.

### C. Ficha de Google Play (en `docs/play-store/`)

- **C1.** `ficha.md`, en español e inglés: nombre, descripción corta (80 caracteres como máximo) y descripción larga. Con el tono de la marca VeoVeo: cercano, entusiasta y breve.
- **C2.** `seguridad-datos.md`: las respuestas del formulario de seguridad de datos de Google Play, sacadas de lo que la app guarda de verdad.
- **C3.** `clasificacion.md`: las respuestas del cuestionario de clasificación de contenido y el público objetivo (hay chat entre usuarios).
- **C4. Capturas:** entre 4 y 8 capturas reales de móvil (Descubrir, Biblioteca, Movie Match, Tier list, Chat) y un gráfico destacado de 1024 × 500.
  - Hazlas con una **cuenta de demostración** en `android:test`. **Pide permiso a Álvaro** antes de crearla en Firebase.
  - Guárdalas también en `docs/readme/` y añádelas al README.

### D. Compilación

- **D1.** Sube la versión a **2.1.0** y el `versionCode` al siguiente.
- **D2.** AAB con `eas build --platform android --profile production` y `EXPO_PUBLIC_DISTRIBUTION=play`.
- **D3.** Instálalo en un móvil desde la pista de pruebas internas o con `bundletool` y prueba el inicio de sesión, el Movie Match, el chat, borrar la cuenta y el aviso de actualización.
- 🛑 **Punto de control:** la subida a Google Play Console la hace **Álvaro**. Déjale en `docs/play-store/subida.md` los pasos exactos.

## Fuera de este encargo

- Funciones nuevas que no estén aquí.
- Rediseños visuales, salvo cambiar el índigo de la app por el turquesa del icono si Álvaro lo aprueba (ver el manual de marca).
- Cambiar el flujo de la versión APK, que se sigue publicando como hasta ahora.

## Definición de terminado

- [ ] A1–A4 hechos y probados en `android:test`.
- [ ] `/privacidad` y `/borrar-cuenta` en producción en `veoveo.dripdev.dev`.
- [ ] B1–B4 hechos; B5 preparado a falta del icono limpio.
- [ ] `docs/play-store/` con ficha, seguridad de datos, clasificación, firma, TMDB y subida.
- [ ] Capturas reales en `docs/readme/` y en el README.
- [ ] AAB 2.1.0 compilado y probado.
- [ ] Apartado "Camino a Google Play" del README actualizado.
- [ ] `typecheck` y `lint` en verde.

## Informe de cierre

> Lo rellena el agente al terminar. El jefe de proyectos lo revisa antes de dar la versión por lista.

- **Qué se ha hecho:**
- **Cómo se ha probado:**
- **Qué datos borra exactamente "Eliminar cuenta" (y qué se hizo con los mensajes):**
- **Cambios en reglas de Firestore y Storage (y si Álvaro los aprobó):**
- **Lo que falta y quién lo tiene que hacer:**
- **Riesgos para la revisión de Google:**

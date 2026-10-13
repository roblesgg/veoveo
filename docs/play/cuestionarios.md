# Cuestionarios de Play Console · VeoVeo 3.0

Respuestas listas para copiar en Play Console → Política → Contenido de la aplicación.
Salen del código de la 3.0 (rama `play/d1-navegacion`). Si cambia algo de lo que recoge la
app, hay que actualizar esto y `public/privacidad.html` a la vez.

**Decidido el 13-10-2026:** edad mínima 16, cuenta de revisión `prueba3` (no se borra) y correo
de contacto `dripdev.dev@gmail.com`.

---

## 1. Política de privacidad
`https://veoveo.dripdev.dev/privacidad`

## 2. Acceso a la aplicación
- **¿Toda la funcionalidad está disponible sin restricciones?** No: hace falta cuenta.
- **Instrucciones para los revisores:**
  - Nombre: `Cuenta de revisión`
  - Usuario: `veoveo.prueba3@dripdev.dev`
  - Contraseña: *(no se pega aquí; Álvaro la copia de `_copias`)*
  - Otras instrucciones: `Entra con correo y contraseña. La cuenta ya tiene amigos y pelis para probar el Movie Match y los chats.`

> **La cuenta `veoveo.prueba3@dripdev.dev` es la cuenta de revisión y NO se borra al publicar.**
> `prueba1` y `prueba2` sí se borran. La contraseña está en `DripDev/_copias/veoveo/`.

## 3. Anuncios
**¿La app contiene anuncios?** No.

## 4. Clasificación de contenido (cuestionario IARC)
- Correo: `dripdev.dev@gmail.com`.
- **Categoría:** «Todas las demás categorías de aplicaciones» *(no es un juego; si la consola
  ofrece «Redes sociales o comunicación», elegir esa)*.

| Pregunta | Respuesta |
|---|---|
| Violencia | No |
| Miedo / terror | No |
| Sexualidad / desnudos | No |
| Juego con apuestas / simulado | No |
| Lenguaje soez | No *(no lo genera la app)* |
| Sustancias controladas | No |
| Humor ofensivo | No |
| **¿Los usuarios pueden interactuar o intercambiar contenido?** | **Sí** (chats y grupos) |
| ¿Se comparte la ubicación del usuario con otros? | No |
| ¿Compras digitales? | No |
| ¿Navegador web o buscador sin restricciones? | No |
| ¿Es principalmente una app de noticias o educativa? | No |

> Contenido adulto: quitado en la 3.0 (OK del 13-10-2026). TMDB se consulta siempre con
> `include_adult=false` y no hay interruptor en Ajustes.

## 5. Público objetivo y contenido
- **Edades objetivo:** **16-17 y 18 o más** (edad mínima 16, como dice `privacidad.html`).
- **¿Atrae a niños?** No.

## 6. Seguridad de los datos

### Visión general
| Pregunta | Respuesta |
|---|---|
| ¿Recoge o comparte alguno de los tipos de datos de usuario obligatorios? | Sí |
| ¿Todos los datos recogidos se cifran en tránsito? | Sí |
| ¿Qué métodos de creación de cuentas admite? | Nombre de usuario y contraseña (correo); OAuth (Google) |
| ¿Los usuarios pueden pedir que se borren sus datos? | Sí |
| URL para borrar la cuenta | `https://veoveo.dripdev.dev/borrar-cuenta` |
| ¿Pueden pedir que se borren algunos datos sin borrar la cuenta? | Sí *(borrar mensajes y pelis de la biblioteca, quitar valoraciones y cambiar o vaciar la frase del perfil, desde la app)* |

### Tipos de datos

**Compartidos:** ninguno. Los proveedores que tratan datos por nosotros (Firebase, Expo para
las notificaciones) son encargados del tratamiento, y Google no los cuenta como «compartir».

| Categoría → tipo | ¿Se recoge? | Obligatorio u opcional | Para qué (en Play) |
|---|---|---|---|
| Información personal → **Correo electrónico** | Sí | Obligatorio | Funcionalidad de la aplicación; Gestión de cuentas |
| Información personal → **ID de usuario** (nombre de usuario, código de amigo, uid) | Sí | Obligatorio | Funcionalidad de la aplicación; Gestión de cuentas |
| Información personal → **Otra información** (foto de Google elegida, frase del perfil) | Sí | Opcional | Funcionalidad de la aplicación |
| Mensajes → **Otros mensajes en la aplicación** (chats y grupos) | Sí | Opcional | Funcionalidad de la aplicación |
| Actividad en la aplicación → **Otro contenido generado por usuarios** (biblioteca, notas, votos del Match, denuncias) | Sí | Opcional | Funcionalidad de la aplicación; Seguridad, cumplimiento y prevención del fraude (denuncias) |
| ID de dispositivo u otros IDs (token de notificaciones) | Sí | Opcional | Funcionalidad de la aplicación |

En cada tipo: **¿Se trata de forma efímera?** No.

**No se recoge:** ubicación, información financiera, salud, fotos y vídeos (subidos), audio,
archivos, calendario, contactos, historial web, interacciones con la app (analítica),
registros de fallos ni diagnósticos.

> Dato técnico: la app guarda la versión de la app y la plataforma en los datos privados de
> la cuenta (para el aviso de versión mínima). Va con el ID de usuario y no es analítica ni
> diagnóstico, así que no se declara aparte.

## 7. Otras declaraciones
| Sección | Respuesta |
|---|---|
| Aplicación gubernamental | No |
| Funciones financieras | Ninguna |
| Salud | Ninguna |
| Aplicación de noticias | No |
| Rastreo de contactos COVID-19 | No |
| ID de publicidad | No se usa *(comprobar en el manifiesto final que no aparece `com.google.android.gms.permission.AD_ID`; si aparece, quitarlo)* |
| Permisos sensibles | Ninguno tras E3 (sin `SYSTEM_ALERT_WINDOW` ni almacenamiento) |

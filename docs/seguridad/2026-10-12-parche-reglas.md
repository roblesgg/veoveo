# Parche urgente de reglas de Firestore y Storage

> 12 de octubre de 2026 · Rama `play/seguridad` · Estado: 🛑 **pendiente de la aprobación de Álvaro. Sin desplegar.**

## Por qué

Al bajar las reglas de producción (encargo de Google Play, tarea B6) salieron cinco fallos. El parche arregla todo lo que se puede arreglar **sin romper la app 2.0.4** que tienen instalada los usuarios. El resto necesita una versión nueva de la app y queda diseñado al final.

## Qué cierra el parche

| # | Antes (producción) | Con el parche |
|---|---|---|
| 1 | Cualquiera con sesión podía reescribir el campo `amigos` de cualquier perfil: añadir a terceros, vaciarlo o quitar amigos. | En un perfil ajeno solo puedes **añadirte o quitarte a ti mismo**, y sin tocar ningún otro campo. |
| 3 | Cualquiera con sesión leía la biblioteca, las tier lists y las preferencias de todos. | Biblioteca (`peliculas`): el dueño y sus amigos. Tier lists, preferencias y cualquier otra subcolección: solo el dueño. |
| 4 | En un chat, un participante podía meter o sacar gente, escribir mensajes en nombre de otro y editar o borrar los mensajes de los demás. | Los participantes, el tipo y la fecha del chat no cambian. Cada mensaje lo firma quien lo envía y solo él lo edita o borra. El último mensaje del chat también tiene que ir firmado por quien escribe. |
| 5 | En un Movie Match, un participante podía cambiar los participantes, los ajustes o cualquier campo. La subcolección `votos` estaba abierta a escritura. | Solo cambian los votos y el resultado (`votes`, `noVotes`, `matchedMovies`, `status`, `finishedAt`). Al crearlo, el creador es quien escribe y solo puede invitar a gente del chat. Nadie puede borrar una partida. `votos` (que la app no usa) queda cerrada. |
| 6 | Una solicitud de amistad se podía crear ya aceptada, y cualquiera de los dos podía cambiar cualquier campo. | Se crea como `pendiente` y para otra persona. Después solo cambia el `estado`. |
| — | Storage sin reglas en el proyecto. | `storage.rules` lo cierra todo. La app no sube archivos: la foto de perfil se guarda como URL en Firestore. |

`configuracion/app` sigue siendo de lectura pública, porque el aviso de versión mínima la lee antes de iniciar sesión. Cualquier colección sin regla queda cerrada.

## Qué queda abierto y por qué

| Qué | Por qué no se cierra ahora | Cuándo |
|---|---|---|
| **Alguien puede añadirse a la lista de amigos de cualquiera** y, con eso, leer su biblioteca. Ya no puede añadir a terceros ni vaciar listas. | La 2.0.4 acepta una solicitud escribiendo primero en el perfil del otro y no deja rastro que las reglas puedan comprobar: el id de la solicitud es aleatorio. Además, el intruso aparece en la lista de amigos de la víctima. | Versión nueva (ver diseño) |
| **Fallo 2: el correo, el `pushToken`, los bloqueados y la versión de la app de cada perfil los lee cualquiera con sesión.** | Las reglas no pueden ocultar campos sueltos, solo documentos enteros. La 2.0.4 lee perfiles ajenos para el buscador (descarga **toda** la colección), la cabecera del chat, la lista de bloqueados y los avisos push. | Versión nueva. El correo se puede quitar antes con una migración de datos (ver más abajo). |
| Dentro de un Movie Match, un participante puede votar en nombre de otro. | Los votos van en un mapa `votes.{idPeli}: [uids]` y las reglas no pueden saber qué clave cambió para comprobar el uid. | Versión nueva: un documento de votos por persona |
| Cualquiera puede crear un chat con cualquier usuario, y cualquier participante puede borrar el chat para todos. | Es como funciona la 2.0.4. Para limitarlo a amigos hace falta antes cerrar el punto de los amigos. | Versión nueva |
| `usuarios/{uid}/biblioteca/*` se puede leer con sesión. | El Movie Match de la 2.0.4 lee esa ruta antigua de cada participante, y en un grupo no todos son amigos entre sí. Si la regla lo negara, la carga de pelis fallaría. Seguramente está vacía (la biblioteca real está en `peliculas`), pero no lo he comprobado en producción. | Versión nueva (el Match leerá `peliculas`) |

## Coste

La regla de amigos de `peliculas` hace una lectura extra (`get` del perfil) por cada consulta a una biblioteca ajena. Es poco comparado con el buscador de la 2.0.4, que lee todos los perfiles en cada búsqueda.

## Cómo se ha probado

- `npm run test:reglas` lanza los emuladores de Firestore y Storage (proyecto `demo-veoveo`, sin tocar producción) y ejecuta **50 tests: 50 en verde**. Necesita Java 21; en esta máquina sirve el de Android Studio (`JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`).
- Hay tres cuentas: Alicia y Beto son amigos y Carla no es amiga de nadie (norma 12).
- Cada ✅ reproduce una llamada real de la 2.0.4 y debe funcionar: registro, buscador, aceptar y rechazar solicitudes, quitar amigos, bloquear, biblioteca propia y de un amigo, tier lists, preferencias, crear chat, enviar mensaje, renombrar grupo, iniciar un Match, votar, terminar la partida, borrar chat y leer el aviso de versión mínima.
- Cada ❌ es un ataque o un acceso indebido y debe fallar.
- **Límite:** los tests imitan las llamadas de la 2.0.4 contra el emulador; no son la app real contra el emulador. Tras el despliegue hay que hacer una prueba rápida en el móvil con la 2.0.4: buscar a alguien, aceptar una solicitud, mandar un mensaje, jugar un Match y abrir la biblioteca de un amigo.
- Fallo previo, no causado por el parche: `ChatListScreen` crea el chat con `crearChat([uid])` sin incluir al propio usuario, así que ya falla en producción. La pantalla normal (Social) sí lo hace bien.

## Despliegue (cuando Álvaro lo apruebe)

```
firebase deploy --only firestore:rules,storage --project veoveo-48667
```

- Si Storage no tiene un bucket creado, el despliegue de `storage` puede fallar. En ese caso se despliega solo `firestore:rules` y se anota.
- **Marcha atrás:** la consola de Firebase guarda el historial de reglas (Firestore → Reglas → historial). Desde ahí se vuelve a la versión anterior en un clic.

## Diseño para la versión nueva (2.1.0)

Va junto con el encargo de Google Play. Exige forzar la actualización con VersionShield: con las reglas nuevas, la 2.0.4 deja de poder aceptar solicitudes y deja de ver correos y tokens ajenos.

1. **Datos privados fuera del perfil público.** `usuarios/{uid}` se queda con lo público: `username`, `username_servido`, `fotoPerfil`, `estado`, `ultimoAcceso` y `amigos`.
   - `usuarios/{uid}/privado/cuenta`: `email`, `bloqueados`, `appVersion` y `platform`. **Solo el dueño.**
   - `usuarios/{uid}/privado/avisos`: `pushToken`. **El dueño y sus amigos.** Los avisos de chat y de Match se envían a participantes de chats, que en los chats individuales siempre son amigos. En un grupo, quien no sea amigo del que escribe no recibirá el aviso. Si eso no vale, la alternativa es guardar el token en cada chat (`chats/{id}/avisos/{uid}`) para que lo lean sus participantes.
   - Hay que migrar los datos que ya existen con un script local con `firebase-admin`, que **necesita el OK de Álvaro**.
2. **Amistad verificable.** La solicitud pasa a tener el id `{deUid}_{paraUid}`. Una regla solo deja añadirse a la lista de otro si existe `solicitudes_amistad/{otro}_{yo}` dirigida a mí. Quitarse uno mismo sigue permitido. Con esto, la comprobación de amigos de `peliculas` pasa a ser fiable.
3. **Buscador** con una consulta por prefijo de `username_servido` y `limit(20)`, en lugar de descargar todos los perfiles.
4. **Votos del Match** en `matches/{id}/votos/{uid}`: cada uno escribe solo el suyo.
5. **Movie Match** lee `peliculas` (de amigos) en lugar de la ruta antigua `biblioteca`, que se cierra.
6. **Chats** solo entre amigos, y borrar un chat lo oculta solo para quien lo borra.

### Mientras tanto: quitar el correo sin esperar a la versión nueva

Se puede borrar el campo `email` de todos los perfiles con un script de administración. La 2.0.4 no lo usa para nada importante: solo como nombre de reserva en la lista de amigos si alguien no tiene `username`. Las cuentas nuevas lo volverían a escribir al registrarse hasta que salga la 2.1.0, así que habría que repetir el script de vez en cuando. Es una escritura en datos reales: **solo con el OK de Álvaro**.

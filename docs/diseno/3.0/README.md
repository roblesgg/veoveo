# VeoVeo 3.0 · Diseño (Fase C)

> 13 de octubre de 2026 · 🛑 Pendiente de la aprobación de Álvaro. **Nada de esto está construido todavía.**
>
> Fuente: manual de VeoVeo (`_marca/drip-garage-recursos/manual-productos/veoveo.md`). Separo lo **observado** (sale del icono actual o del manual) de lo **propuesto** (nuevo, lo decide Álvaro).

## Qué hay en esta carpeta

| Archivo | Qué es |
|---|---|
| `marca/hoja-marca.png` | El icono actual al lado de la reconstrucción, el icono adaptativo, el logotipo, el monocromo y los iconos propios. |
| `marca/*.svg` | Los vectores, listos para exportar a PNG en la Fase D. |
| `maquetas/*.png` | 10 pantallas a tamaño de móvil (390 × 844), con pósters reales de TMDB y amigos de ejemplo. |

Las maquetas son HTML capturado con Playwright: sirven para decidir, no son la app. Los textos de ejemplo («Porque te gustó Dune» y otros) son datos inventados para enseñar el formato.

## Decisiones ya tomadas (aplicadas)

- **Paleta** (Álvaro, 13-10-2026): el índigo y el morado pasan al **turquesa `#69DFD9`**. El celeste `#38BDF8` sigue siendo la acción principal y el fondo de noche no cambia. Está en el código desde el commit `3a56f66`, que también pasa al turquesa el naranja heredado `#ff6b00` del Match.
- **Solo español** en la 3.0 (decisión del jefe de proyectos).

## Marca

| Pieza | Estado | Nota |
|---|---|---|
| Icono sin marca de agua | **Propuesta** | Reconstrucción vectorial fiel: degradado del manual, brillo turquesa abajo a la izquierda, grano y «VeoVeo» en Montserrat Medium. El encargo (B5) pedía que el icono limpio lo trajera Álvaro, así que **decide él**: o vale la reconstrucción o manda el original limpio. |
| Icono adaptativo de Android | **Propuesta** | Fondo y primer plano separados; el logotipo cabe en la zona segura (círculo de 66 dp). |
| Logotipo «VeoVeo» en SVG | Observado | Pendiente del manual. En trazos, sin depender de la fuente. |
| Monocromo para notificaciones | **Propuesta** | La marca no tiene símbolo; propongo la «V» del logotipo. |
| Iconos propios: claqueta y palomitas | Observado (los pide el manual) | Trazo de 2 px redondeado. **Aprendido en las maquetas:** a 20 px las palomitas parecen una papelera. Por eso se usan solo en grande (ilustraciones, estados vacíos y resultado del Match). |

## Iconos de la interfaz

**Propuesta:** pasar de Ionicons a **Tabler Icons** (`@tabler/icons-react-native`, licencia MIT). Su estilo es justo el del manual: trazo de 2 px, extremos y uniones redondeados, sin relleno. Los dos iconos propios conviven con ellos sin desentonar.

## Navegación (D1)

Cuatro pestañas: **Descubrir · Biblioteca · Chats · Social**.

- **Chats** ocupa el hueco de Tier Lists, como dice el encargo, con un contador de no leídos.
- **Perfil** no es pestaña: está en el avatar de arriba a la derecha de cada pantalla, como ahora. Se usa poco y así la barra se queda en 4.
- **Movie Match** no es pestaña: se lanza desde un chat o desde Social. Su icono es el de **cartas** (deslizar), en turquesa.
- Iconos de la barra: brújula, **claqueta** (Biblioteca, icono propio), bocadillo y amigos.

## Pantallas (ver `maquetas/`)

1. **Descubrir:** barra nueva y «Recomendado para ti» con el motivo debajo de cada póster.
2. **Social:** muro de amigos con:
   - fila de amigos;
   - «Visto últimamente» (quién, cuándo y estrellas);
   - categorías con chips («Lo de miedo de tus amigos»);
   - debajo, «Favoritas de tus amigos» y «En su Por ver», con un botón para proponer Movie Match.
3. **Chats:** búsqueda, grupos con emoji, contador de no leídos, silenciados, «Mensaje eliminado», leído (✓✓) y la etiqueta «Match en curso · 2 de 3».
4. **Conversación:**
   - separador por día y hora en cada mensaje;
   - nombre del remitente en grupos;
   - respuesta citada, «Mensaje eliminado» y «editado»;
   - peli compartida y tarjeta del Match en curso.
5. **Acciones de un mensaje** (pulsación larga): reacciones y Responder, Editar, Copiar, Borrar para todos, Borrar solo para mí y Denunciar.
6. **Información del grupo:** emoji, nombre, silenciar, miembros con administrador, añadir amigos, salir y denunciar.
7. **Movie Match · configurar:**
   - con quién (desde el chat o a mano);
   - cuántas coincidencias (1 a 5);
   - qué pelis salen: el Por ver de todos, las Vistas si cada uno lo permite y recomendaciones para el grupo.
8. **Movie Match · deslizar:**
   - progreso de coincidencias y «Terminar»;
   - carta con póster y el porqué («En el Por ver de Laura y Dani»);
   - botones No, Info y Sí.
9. **Movie Match · resultado:** «¡Es un match!» con todas las coincidencias para elegir.
10. **Estados:** vacío (con palomitas), carga con esqueletos y error con reintento.

## Esperas: loader de marca y esqueletos

Un loader **no acelera nada**: hace la espera más llevadera. Lo que acelera la app es B1 (carga perezosa, caché persistente, una sola escucha).

- **Loader animado: solo en esperas a pantalla completa** (arranque y preparar el Movie Match). Tres variantes en `maquetas/loaders.html` (ábrelo en el navegador para verlas moverse) y `maquetas/11-loaders.png`:
  - **A · Palomitas que saltan:** tres granos salen del cubo, escalonados.
  - **B · Claqueta:** la tapa se cierra de golpe con un pequeño rebote.
  - **C · La «V» se dibuja:** el trazo de la V del logotipo se escribe y se borra.
  - Todas van en turquesa sobre noche.
  - El que Álvaro pasó (pétalos en morado `#5c3d99`) no entra tal cual: el morado está fuera de la paleta y los pétalos no dicen nada de VeoVeo.
- **Carruseles, biblioteca y chats: esqueletos.** Huecos con la forma real del póster y un brillo que pasa, como Netflix o Filmin. No habrá indicadores giratorios por la app.
- **Técnica:** Reanimated 3 (en el hilo de UI, 60 fps) más `react-native-svg` (instalado en `af8d8dd`). Con «reducir movimiento» activado, solo un fundido suave.

## Calidad de imagen

La calidad final no se recorta: se carga de forma progresiva.

- El fondo de la ficha vuelve a **w1280** (en un S23 de 1080 px, la w780 se veía blanda). Se pinta antes una w300 como marcador y la w1280 entra encima con un fundido. Está en `af8d8dd`.
- Revisado el resto:
  - pósters de los carruseles en **w342** (130 dp ≈ 341 px en el S23);
  - logos de plataformas de w92 a **w154**;
  - pósters del selector del chat de w185 a **w342**.

## Movimiento (manual: 260 ms, `cubic-bezier(.2,.8,.2,1.2)`)

- **Carta del Match:** sigue al dedo; al soltarla sale con la inercia del gesto, en el hilo de UI con Reanimated. Al llegar a una coincidencia, un pequeño rebote y vibración ligera.
- **Social:** las filas entran escalonadas (40 ms entre una y otra, 260 ms cada una), solo la primera vez.
- **Chats:** el mensaje nuevo entra desde abajo con un fundido corto.
- **Todo** respeta la opción del sistema de reducir movimiento: sin vuelos ni escalonados, solo fundidos.

## Funciones básicas: reparto por fase (aprobadas todas)

### Fase D, prioridad (lo que pidió el jefe de proyectos)
- Borrar un mensaje propio **para todos** («Mensaje eliminado»).
- Aceptar y rechazar solicitudes (ya existen; pasan a una escritura en lote, para que no queden amistades a medias).
- Quitar amigos.
- Bloquear y desbloquear, con bloqueo **de verdad**: el bloqueado no te encuentra, no te escribe y no te ve en el Match ni en Social.

### Fase D, por pantalla
- **Chats (D2):**
  - borrar solo para mí, editar («editado»), responder o citar;
  - no leídos con contador, y leído;
  - silenciar, y borrar o archivar un chat solo para mí;
  - grupos: crear, renombrar, emoji, añadir y quitar miembros (administrador), salir y ver miembros;
  - hora y separadores por día, e ir al último mensaje.
- **Amigos y Social (D4):**
  - buscar por nombre (por prefijo, sin descargar todos los perfiles);
  - enviar y **cancelar** solicitudes;
  - perfil y biblioteca de un amigo según su privacidad;
  - tirar para recargar.
- **Perfil y cuenta:**
  - editar el nombre y una frase o bio;
  - privacidad: quién ve tu biblioteca, si tus Vistas salen en Social y en el Match, y quién puede enviarte solicitudes;
  - cambiar la contraseña y el correo (con verificación);
  - descargar mis datos: un JSON que se comparte desde el móvil.
- **App:**
  - ajustes de notificaciones por tipo (mensajes, solicitudes, Match);
  - contacto o soporte (correo a `Alvaro@dripdev.dev`);
  - estados vacíos, de carga y de error en todas las pantallas;
  - aviso de «sin conexión» con lo que haya en caché;
  - bienvenida de 3 pantallas para usuarios nuevos.
- **Biblioteca:** cambiar la fecha de vista y la valoración, ya hechos en B2.

### Fase E (Google Play)
- **Borrar tu cuenta** desde la app y desde la web.
- **Denunciar** usuarios, mensajes y grupos.
- **Acerca de** completo: versión, TMDB y JustWatch, privacidad, términos y borrar cuenta.

## Decidido por el jefe de proyectos (13-10-2026)

- **Idioma:** la 3.0 sale **solo en español**, también la ficha de Google Play. Fuera de la lista.
- **Foto de perfil desde la galería:** **no entra en la 3.0**. Necesita Firebase Storage, y desde octubre de 2024 crear el bucket exige el plan **Blaze**. Blaze tiene una franja gratuita, pero pide una tarjeta, y la norma de Álvaro es coste cero. Sigue la foto de Google, ya a la resolución real del dispositivo (`4932cda`). **Candidata para la 3.1**, si Álvaro quiere verla.

## Nota técnica

- **Notificaciones por tipo:** sin servidor (coste cero), el aviso lo manda el móvil del que escribe, así que tiene que poder leer las preferencias del destinatario. Encaja con el diseño de seguridad de D5: preferencias y token en un documento que solo leen sus amigos.

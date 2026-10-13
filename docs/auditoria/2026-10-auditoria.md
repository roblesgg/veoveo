# Auditoría de VeoVeo · octubre de 2026

> Fase A del encargo `2026-10-13-veoveo-3.md`. Hecha el 13 de octubre de 2026 sobre la rama `play/seguridad` (código igual que la 2.0.4 salvo el Movie Match, que en `main` es más nuevo). **Sin cambios de código.**
>
> Las cifras de llamadas salen de leer el código. Los tiempos reales se miden en el móvil en la Fase B1.

## Resumen para decidir

| # | Problema | Causa | Gravedad |
|---|---|---|---|
| 1 | La carga en frío es lenta | 8 carruseles a la vez, y **cada carrusel pide además las plataformas de sus 20 pelis una a una**: **~168 llamadas a TMDB** antes de pintar nada. A eso se suman **1,5 s de splash forzado** y una caché que se pierde al cerrar la app. | 🔴 |
| 2 | Los filtros de Descubrir enseñan lo que no es | "Estrenos en Cartelera" pide una **página al azar del 1 al 8** de `now_playing` **sin región**. Tres carruseles por defecto no existen en la lista y **caen en Acción**. Varios géneros mezclan mal (Anime = Animación, Superhéroes = Acción + Fantasía + Ciencia ficción a la vez…). No hay "Próximamente". | 🔴 |
| 3 | Fecha de "vista" incorrecta | Las vistas se agrupan por `fechaAnadido`, no por `fechaVisto`. Además, **cambiar la nota de una peli vista la borra y la vuelve a crear con fecha de hoy**. | 🔴 |
| 4 | El Movie Match no usa las listas Por ver | Lee `usuarios/{uid}/biblioteca/por_ver`, una ruta en la que **nadie escribe**. El mazo son siempre tendencias y populares, **barajadas distinto en cada móvil**, así que coincidir es cuestión de suerte. | 🔴 |
| 5 | Chats con fallos | El Match activo no se ve si entras al chat desde la lista, y eso lleva a crear partidas duplicadas. La pantalla `ChatList` crea chats sin incluirte. En los grupos no se ve quién escribe. Se carga todo el historial de golpe. | 🟠 |
| 6 | Borrar una peli sin querer | En la ficha de una peli vista, abrir la nota y pulsar "No valorar" **la quita de la biblioteca**. | 🟠 |
| 7 | Gasto de Firestore (plan Spark) | El buscador de usuarios **descarga todos los perfiles** en cada búsqueda. Hay escrituras de "online/ausente" cada vez que la app pasa a primer o segundo plano. La "actividad de amigos" de cada ficha hace dos lecturas por amigo. | 🟠 |
| 8 | Código muerto y duplicado | 7 archivos que nadie importa, dos sistemas de aviso de versión y tres barras de navegación. | 🟡 |
| 9 | "Español e inglés" no es real | Solo hay **una** llamada a `t()` en toda la app: está todo escrito a mano en español. | 🟡 |
| 10 | Lint | `typecheck` en verde. `lint` da **4.894 avisos** y 0 errores; casi todos son de formato y se arreglan solos con `--fix`. | 🟡 |

## 1. Mapa de la app

### Navegación

- `App.tsx` monta `QueryClientProvider` → `LanguageProvider` → `AuthProvider` → `RootNavigator`. Encima van `VersionShield` (aviso de versión mínima), `IOSInstallPrompt`, `NotificationPermissionPrompt` y el banner de notificaciones dentro de la app.
- `RootNavigator` (stack nativo) tiene tres flujos:
  - **Sin sesión:** Login · Register.
  - **Sin verificar:** Verification.
  - **Con sesión:** Main · Perfil · Bloqueados · Solicitudes · BibliotecaAmigo · Ajustes · Actor · Pelicula · **ChatList** · ChatDetail · MovieMatch · MatchConfig.
  - `ChatList` no se abre desde ningún sitio: es una pantalla huérfana.
- `MainScreen` hace de pestañas a mano: 0 Descubrir · 1 Biblioteca · 2 Tier Lists · 3 Social, con `LiquidBottomBar`. Cada pestaña se desmonta al cambiar a otra, así que vuelve a cargar al volver.
- Enlaces profundos: `veoveo://`, `veoveo.dripdev.dev`, **`veoveo-app.netlify.app`** (sobra; tarea B2 de Google Play) y `dripdev.dev`. Rutas: `movie/:id`, `actor/:id`, `ajustes` y `perfil`.

### Servicios y quién usa qué

| Servicio | Lo usan |
|---|---|
| `tmdbClient` (todas las llamadas a TMDB) y `tmdbQueries` (carruseles) | Descubrir, Pelicula, Actor, Biblioteca (lista de plataformas) y MovieMatch, que también **llama a `tmdbApi` directamente** |
| `repositorioUsuarios` | Auth, Perfil, Bloqueados, BibliotecaAmigo |
| `repositorioSocial` | Social, Solicitudes, ficha de peli (actividad de amigos) |
| `repositorioPeliculasUsuario` | ficha de peli, BibliotecaAmigo |
| `repositorioChats` | Social (lista de chats), ChatDetail, MatchConfig |
| `repositorioMatches` | MatchConfig, MovieMatch, ChatDetail |
| `repositorioTierLists` | Tier Lists |
| `notificationService` | Auth (token), App, chats y matches (envío de push) |
| `userPreferences` (Firestore) y `storage/preferences` (AsyncStorage) | Descubrir, Biblioteca, Ajustes |
| **Lectura y escritura de Firestore fuera de los repositorios** | `App.tsx` (pushToken), `ChatDetailScreen` (chat, perfil y nombre del grupo), `MovieMatchScreen` (biblioteca antigua), `PerfilScreen`, `UpdateGuard`, `useLibraryStatus`, `useLibraryData` |

### Firestore: quién lee y quién escribe

| Colección | Escribe | Lee |
|---|---|---|
| `usuarios/{uid}` | el dueño: perfil, estado, versión, pushToken (desde **dos** sitios) y bloqueados. Otros: `amigos` al aceptar una solicitud o quitar un amigo. | todos con sesión: buscador (colección entera), lista de amigos, cabecera del chat, bloqueados y push |
| `usuarios/{uid}/peliculas` | el dueño | el dueño (2 escuchas a la vez: `useLibraryStatus` y `useLibraryData`) y sus amigos (BibliotecaAmigo, actividad de amigos) |
| `usuarios/{uid}/perfil/preferencias` | el dueño | el dueño |
| `usuarios/{uid}/tierLists` | el dueño | el dueño |
| `usuarios/{uid}/biblioteca/*` | **nadie** | MovieMatch (por error) |
| `solicitudes_amistad` | quien envía y quien recibe | los dos |
| `chats` y `chats/{id}/msj` | los participantes | los participantes |
| `matches` | los participantes (mapas `votes`/`noVotes`) | los participantes |
| `configuracion/app` | `scripts/push-version.mjs` (admin) | todos, también sin sesión |

## 2. Fallos, con archivo y cómo reproducirlos

### 2.1 Carga en frío (🔴)

**Qué pasa al abrir la app con sesión, en orden:**

1. **Splash mínimo de 1,5 s:** `MainScreen.tsx:66-71` espera 1.500 ms **después** de cargar las fuentes, aunque todo esté listo.
2. **Auth** (`AuthContext.tsx:92-98`): 1 lectura del perfil, 3 escrituras (estado online, versión y pushToken) y la lectura de preferencias. Además pide **el permiso de notificaciones nada más entrar**, por duplicado con `NotificationPermissionPrompt`. `App.tsx:155-163` vuelve a escribir el token.
3. **MainScreen** lee el perfil otra vez (`MainScreen.tsx:46-53`) cada vez que gana el foco.
4. **Descubrir**, con los 8 carruseles por defecto (`storage/preferences.ts:10-19`):
   - `useQueries` lanza los 8 a la vez (`useDescubrir.ts:21`), aunque solo se vean 2.
   - Cada carrusel pide su lista y **después las plataformas de cada una de sus 20 pelis** (`tmdbQueries.ts:59-74`), y no pinta nada hasta que terminan todas.
   - Total: **8 + 160 = ~168 peticiones a TMDB**. Las plataformas solo sirven para un puntito verde o naranja en el póster.
5. **Biblioteca en segundo plano:** `useLibraryStatus` escucha **toda** la colección `peliculas` para los iconos de los pósters: una lectura por peli guardada.

**Caché:**
- `new QueryClient()` sin persistencia (`App.tsx:45`). Cada arranque en frío empieza de cero.
- Las cachés de `tmdbClient` (`Map` en memoria) también se pierden.

**Imágenes:**
- Los pósters de Descubrir y Biblioteca usan `Image` de React Native, no `expo-image` (`PosterItem.tsx:27`, `BibliotecaTab.tsx:175`). Sin control de caché en disco ni transición.
- El tamaño es `w342` para un póster de 130 px (correcto en pantallas 2,6x).
- El fondo de la ficha baja `w1280` (`PeliculaScreen.tsx:141`), pesado para algo que va difuminado.

**Otras causas menores:**
- El página aleatoria hace que la caché nunca acierte entre sesiones.
- Las tendencias se barajan con `sort(() => Math.random() - 0.5)`.

### 2.2 Filtros de Descubrir (🔴)

Archivos: `constants/carruseles.ts`, `services/tmdbQueries.ts`, `storage/preferences.ts`, `DiscoverTab.tsx`.

| Carrusel | Qué hace | Por qué está mal |
|---|---|---|
| Estrenos en Cartelera | `movie/now_playing` **página aleatoria del 1 al 8**, **sin `region=ES`** | Salen pelis que ya no están en cines o que nunca se estrenaron en España. Con la página 8 aparecen las menos relevantes. |
| Mejor Valoradas, Populares | página aleatoria del 1 al 8 | Bien para variar, pero rompe la caché. |
| **Interesante para ti** | **no existe en la lista** → cae en `obtenerIdGenero` → **Acción (28)** | El nombre promete recomendaciones y enseña acción. |
| **Joyas de los 80/90**, **Acción y Pura Adrenalina** | nombres antiguos que no están en `CARRUSELES_DISPONIBLES` | Funcionan de casualidad, por el `includes('80/90')` y por el "Acción" por defecto. No se pueden quitar ni volver a añadir desde el selector. |
| Próximamente | **no existe**. `DiscoverTab.tsx:157` tiene `['Tendencias','Próximamente','Populares']`, pero esa rama nunca se ejecuta porque `cargarCarruselesActivos` nunca devuelve vacío. Si se ejecutara, también caería en Acción. | El README promete "Próximamente". |
| Anime | género 16 (Animación) | Falta `with_original_language=ja`. Sale Pixar. |
| Superhéroes, Espacio, Clásicas, Samuráis, Zombis, Policial | varios géneros con coma: **Y lógico**, todos a la vez | Resultados escasos y raros. Superhéroes no usa la palabra clave "superhero". Zombis es terror + thriller. |
| Musical / Música, Crimen / Cine Negro / Policíaca | el mismo género con distinto nombre | Carruseles duplicados. |
| Cualquier género | `discover` sin `vote_count.gte` | Salen pelis desconocidas sin póster ni votos. |

Además:
- **Región y fechas:** ninguna consulta usa `region` ni `release_date` con la fecha de hoy, salvo las décadas.
- **Recargar** un carrusel sí cambia la página, pero el efecto de carga inicial de `CarruselPeliculas.tsx:62-64` llama a `cargarCarrusel(titulo)` sin `forzar`, que no hace nada: es código muerto.

### 2.3 Fecha de "vista" (🔴)

- **Agrupación:** `BibliotecaTab.tsx:152-158` agrupa Vistas en "Última semana / Último mes / Anteriores" por **`fechaAnadido`**. `fechaVisto` solo se escribe al crear la peli directamente como vista.
- **Re-valorar resetea la fecha:**
  - En la ficha, `MovieRatingButton` → `MovieRatingModal.onGuardar` → `onToggleVista(v)` (`PeliculaScreen.tsx:275-278`).
  - Para una peli ya vista con nota distinta de 0, `useUserMovieStatus.ts:107-131` entra en la rama "alta nueva": **borra la peli y la vuelve a crear con `fechaAnadido = fechaVisto = ahora`**.
  - **Así se reproduce el caso de Álvaro:** una peli vista hace años, a la que cambias la nota, pasa a "Última semana".
- **De Por ver a Vista:** solo cambia `estado` (`useUserMovieStatus.ts:109`). No escribe `fechaVisto` y conserva la fecha en que la añadiste a Por ver. Una peli vista hoy puede salir en "Anteriores".
- **No se puede indicar cuándo la viste:** marcar ahora algo que viste hace tiempo siempre cuenta como "esta semana".
- **"No valorar" borra** (`PeliculaScreen.tsx:271-274`): en una peli vista, `onToggleVista(0)` entra en "desmarcar" y la elimina.
- **Las operaciones no son atómicas:** borrar y crear son dos escrituras. Si la segunda falla, la peli desaparece.
- `onActualizarValoracion` existe y hace lo correcto (solo actualiza `valoracion`), pero **no se usa**.
- **Datos ya guardados mal:** la fecha real de visionado no se puede recuperar.
  - **Propuesta (B2):** a partir de la 3.0, agrupar por `fechaVisto ?? fechaAnadido` y dejar corregir la fecha a mano.
  - Antes de proponer una migración, se puede contar en producción, en solo lectura y con recuentos (norma 28), cuántas vistas no tienen `fechaVisto`. Pendiente.

### 2.4 Chats (🟠)

| Fallo | Dónde | Cómo reproducirlo |
|---|---|---|
| El Match activo solo se detecta si llega como parámetro de la ruta | `ChatDetailScreen.tsx:210-213` (ignora `chatInfo.activeMatchId`) | Entrar al chat desde Social: el botón de Match siempre lleva a **configurar uno nuevo**, aunque haya uno en curso → partidas duplicadas. |
| `crearChat([uid])` sin el propio usuario | `ChatListScreen.tsx:47` | Esa pantalla no se abre desde ningún sitio; si se abriera, falla con permiso denegado. |
| En los grupos no se ve quién escribe cada mensaje | `MessageBubble` (`ChatDetailScreen.tsx:150-156`) | Grupo de 3: las burbujas ajenas no llevan nombre. |
| El nombre del remitente sale de `user.displayName` (Auth) y no del `username` | `ChatDetailScreen.tsx:257`, `MatchConfigScreen.tsx:43` | Cuentas de correo: las notificaciones dicen "Nuevo mensaje de Usuario". |
| Se carga todo el historial sin límite | `repositorioChats.ts:77-85` | Chats largos: lectura de todos los mensajes al abrir. |
| Los push se envían uno a uno y esperando cada envío | `repositorioChats.ts:117-124` | Grupos: el envío tarda más por cada participante. |
| Borrar un chat lo borra **para todos**, y los mensajes quedan huérfanos en `msj` | `SocialTab.tsx:218`, `repositorioChats.ts:134-137` | — |
| Teclado animado con `Animated` en el hilo de JS (`useNativeDriver: false`) | `ChatDetailScreen.tsx:219-247` | Saltos al abrir el teclado en Android. |
| Cualquiera puede abrir chat con cualquiera (las reglas no exigen amistad) | reglas y `crearChat` | — |

### 2.5 Movie Match (🔴)

| Fallo | Dónde |
|---|---|
| **El mazo ignora las listas Por ver:** lee `usuarios/{uid}/biblioteca/por_ver` (campo `peliculas`), que no existe. La biblioteca real está en `usuarios/{uid}/peliculas`. | `MovieMatchScreen.tsx:117-135` |
| **Cada móvil genera un mazo distinto:** barajado local y páginas aleatorias de Populares. Para que haya match **todos** tienen que votar la misma peli. | `MovieMatchScreen.tsx:163-191` |
| `excludeSeen` se guarda pero **no se usa** | `MatchConfigScreen.tsx:27`, `MovieMatchScreen` |
| El mazo no es compartido: si alguien entra más tarde, ve otras pelis | igual |
| La comprobación de match vuelve a leer el documento tras votar. Con dos votos a la vez puede notificar dos veces. Avisa también a quien vota. | `repositorioMatches.ts:91-127` |
| No hay forma de terminar antes: solo termina al llegar al objetivo | — |
| Los votos van en mapas compartidos (`votes.{peli}: [uids]`), así que cualquiera puede votar por otro (ver el informe del parche) | `repositorioMatches.ts:85-89` |
| `matchEngine.ts` es otra implementación (con otro esquema de votos) que **nadie usa** | `services/matchEngine.ts` |

### 2.6 Social y perfil (🟠)

- **Buscador:** `buscarUsuarios` hace `getDocs(collection('usuarios'))` y filtra en el móvil (`repositorioSocial.ts:46-62`). Lee **todos** los perfiles por búsqueda: gasto en Spark y privacidad.
- **Actividad de amigos en cada ficha:** `obtenerActividadAmigosPelicula` lee los perfiles de los amigos y un documento por amigo, más el `get` de la regla.
- **Estado online:** cada cambio de primer o segundo plano escribe en Firestore (`AuthContext.tsx:117-130`). Son muchas escrituras al día con pocos usuarios.
- **Aceptar una solicitud** son tres escrituras sueltas, sin lote. Si falla la segunda, la amistad queda a medias (`repositorioSocial.ts:187-202`).
- **Bloquear** no oculta al bloqueado del buscador, de los chats ni del Match: solo lo quita de amigos. Pendiente de A4 de Google Play.

### 2.7 Otros

- **Registros con datos personales:** `AuthContext.tsx:87` escribe el correo en el log y `notificationService.ts:75` el token push (norma 5).
- **`projectId` de Expo fijo en el código:** `notificationService.ts:71`. No es secreto, pero debería salir de `expo-constants`.
- **`VersionShield`:** las notificaciones locales abren `download_url`. Eso es lo que hay que cambiar para Google Play (A3).
- **i18n:** `LanguageContext` existe, pero los textos están escritos a mano en español. "ES · EN" del README no es cierto hoy.
- **Colores:** el índigo y el morado (`#6366F1`, `#6C63FF`) aparecen sueltos en componentes (`FilterSortMenu.tsx`), y hay naranjas heredados (`rgba(255,107,0,…)` en `BibliotecaTab.tsx:321-322`). **Decisión de Álvaro (13-10-2026): pasan al turquesa `#69DFD9`**, con el celeste `#38BDF8` como principal.

## 3. Código muerto, duplicado o incoherente

**Archivos que nadie importa:**
- `components/glass/GlassContainer.tsx`
- `components/PremiumGlass.tsx`
- `components/InputModal.tsx`
- `components/MainBottomBar.tsx`
- `components/PremiumBottomBar.tsx`
- `components/UpdateGuard.tsx`: un segundo aviso de versión, distinto de `VersionShield`.
- `services/matchEngine.ts`
- `services/storageServices.ts`

**Funciones exportadas sin uso:**
- `reemplazarPorPorVer` y `contarPeliculasPorEstado` (`repositorioPeliculasUsuario.ts`)
- `onActualizarValoracion` (se exporta del hook pero no se usa)
- `crearPerfilPorDefecto`

**Duplicados:**
- Dos escuchas de la misma colección `peliculas` (`useLibraryStatus` y `useLibraryData`).
- El pushToken se escribe desde dos sitios.
- El permiso de notificaciones se pide desde dos sitios.
- Hay dos versiones de "obtener perfil por uid" (`repositorioUsuarios` y `repositorioSocial.getPerfil`).

**Firestore fuera de los repositorios:** `App.tsx`, `ChatDetailScreen`, `MovieMatchScreen`, `PerfilScreen` y los hooks de biblioteca.

**TMDB fuera de su módulo:**
- `MovieMatchScreen` y `BibliotecaTab` llaman a `tmdbApi` directamente.
- `ChatDetailScreen` monta la URL de la imagen a mano (`w300`, un tamaño que no está en `posterUrl`).

**`require` dentro de componentes** para romper ciclos (`DiscoverTab.tsx:118` con `useAuth` y `177` con `userPreferences`; `repositorioSocial.ts:246`).

**`App.tsx`:** estilos `debug*` sin uso.

**Tier Lists** (a quitar en B3): `TierListsTab.tsx` (585 líneas), `components/tierlist/*` (4 archivos), `hooks/tierlist/*` (2), `repositorioTierLists.ts`, los tipos `TierList`, la lógica de "pantallaTierList" en `MainScreen` y el `BackHandler`.

**Comentarios que hablan del proyecto antiguo en Kotlin** ("Misma lógica que MainScreen.kt") y emojis decorativos en los comentarios.

## 4. Funciones básicas

✅ existe y funciona · ⚠️ existe pero falla o está a medias · ❌ falta

**Mensajes y chats**

| Función | Estado | Nota |
|---|---|---|
| Borrar un mensaje propio para todos ("Mensaje eliminado") o solo para mí | ❌ | — |
| Editar un mensaje (marca "editado") | ❌ | — |
| Responder o citar | ❌ | — |
| No leídos (contador) y leído | ❌ | — |
| Silenciar un chat o grupo | ❌ | — |
| Borrar o archivar un chat solo para mí | ⚠️ | Borrar existe, pero lo borra **para todos** y deja los mensajes huérfanos |
| Grupos: crear | ✅ | Desde Social, eligiendo amigos |
| Grupos: renombrar | ✅ | Cualquier participante |
| Grupos: foto o emoji | ❌ | Se lee `groupIcon`, pero nada lo escribe |
| Grupos: añadir o quitar miembros (administrador) | ❌ | No hay administrador |
| Grupos: salir del grupo | ❌ | — |
| Grupos: ver los miembros | ❌ | — |
| Denunciar un mensaje o chat | ❌ | Tarea A4 de Google Play |
| Hora en cada mensaje y separadores por día | ❌ | Las burbujas no llevan hora |
| Ir al último mensaje | ✅ | Lista invertida |

**Amigos y personas**

| Función | Estado | Nota |
|---|---|---|
| Buscar por nombre de usuario | ⚠️ | Funciona, pero descarga todos los perfiles y no filtra a los bloqueados |
| Enviar solicitud | ✅ | — |
| Cancelar solicitud | ❌ | — |
| Aceptar o rechazar | ✅ | Aceptar son 3 escrituras sueltas; si una falla, la amistad queda a medias |
| Quitar de amigos | ✅ | Desde la biblioteca del amigo |
| Bloquear | ⚠️ | Solo quita de amigos y apunta en `bloqueados`. **No oculta** en el buscador, los chats, Social ni el Match |
| Desbloquear y lista de bloqueados | ✅ | `BloqueadosScreen` |
| Denunciar a un usuario | ❌ | Tarea A4 de Google Play |
| Ver el perfil y la biblioteca de un amigo | ✅ | Sin ajustes de privacidad |

**Perfil y cuenta**

| Función | Estado | Nota |
|---|---|---|
| Editar el nombre | ✅ | — |
| Foto o avatar | ⚠️ | Solo pegando un enlace o usando la foto de Google; no se puede elegir de la galería |
| Frase o bio | ❌ | — |
| Privacidad (biblioteca, Vistas en Social y Match, solicitudes) | ❌ | Solo existe el ajuste de contenido para adultos |
| Borrar mi cuenta | ❌ | Solo existe el texto "Eliminar cuenta" (tarea A1 de Google Play) |
| Cerrar sesión | ✅ | — |
| Cambiar la contraseña | ❌ | `changePassword` está en `AuthContext`, pero no hay pantalla que lo use |
| Cambiar el correo | ❌ | — |
| Descargar mis datos | ❌ | — |

**Películas y biblioteca**

| Función | Estado | Nota |
|---|---|---|
| Quitar de Por ver o de Vistas | ✅ | — |
| Cambiar la fecha en que la vi | ❌ | Ver 2.3 |
| Cambiar o quitar la valoración | ⚠️ | Cambiarla **resetea la fecha**; "No valorar" **borra la peli** (ver 2.3) |
| Ordenar y filtrar | ✅ | Recientes, A-Z, estreno, nota, plataformas y búsqueda |

**La app en general**

| Función | Estado | Nota |
|---|---|---|
| Ajustes de notificaciones por tipo | ❌ | Solo el permiso general |
| Idioma ES/EN | ⚠️ | Existe el contexto, pero solo hay un texto traducido |
| Acerca de | ⚠️ | Ajustes muestra la atribución de TMDB en inglés y "**VeoVeo v1.9.1 · Developed by Drip Dev**" escrito a mano: versión equivocada y marca mal escrita. No hay enlaces a privacidad, términos ni borrar cuenta |
| Contacto o soporte | ❌ | — |
| Estados vacíos | ⚠️ | Algunos ("No tienes amigos agregados", "Sin películas en esta sección"); faltan en Biblioteca y Chats |
| Esqueletos de carga | ❌ | Solo indicadores giratorios, y los carruseles salen vacíos |
| Errores con reintento | ⚠️ | Solo en Perfil |
| Sin conexión | ❌ | No se detecta y no hay caché persistente |
| Tirar para recargar | ⚠️ | En Descubrir y Biblioteca; no en Social ni en Chats |
| Bienvenida para usuarios nuevos | ❌ | — |

**Recuento: 12 ✅ · 10 ⚠️ · 25 ❌.** Los que más se notan: borrar o editar mensajes, no leídos, salir de un grupo, cancelar solicitudes, que bloquear oculte de verdad, borrar la cuenta y cambiar la fecha de vista.

## 5. Propuesta de limpieza, por impacto

1. **Arranque (B1):**
   - Quitar las plataformas por peli de los carruseles: se piden solo en la ficha, o con `watch_region=ES&with_watch_providers` cuando el usuario filtra.
   - Cargar solo los carruseles visibles.
   - `expo-image` con `cachePolicy="memory-disk"` en todos los pósters.
   - Persistir TanStack Query en AsyncStorage (`@tanstack/query-async-storage-persister`).
   - Quitar los 1,5 s del splash.
   - Una sola escucha de la biblioteca.
   - Escrituras de arranque agrupadas y solo cuando cambian.
2. **Biblioteca (B2):**
   - `fechaVisto` siempre al pasar a vista, también desde Por ver.
   - Re-valorar = `actualizarValoracion`, sin borrar.
   - "No valorar" no borra.
   - Agrupar por `fechaVisto ?? fechaAnadido`.
   - Opción de cambiar la fecha.
   - Transacciones en lugar de borrar y crear.
3. **Descubrir (B4):**
   - Catálogo de carruseles nuevo con configuración declarativa y probada (región ES, fechas reales, `vote_count` mínimo, Anime con idioma `ja`, palabras clave de TMDB para superhéroes y zombis).
   - Migrar los nombres guardados en AsyncStorage y Firestore.
   - "Recomendado para ti" según `docs/recomendaciones.md`.
4. **Quitar Tier Lists (B3)** y el código muerto de la sección 3.
5. **Capas:** todo Firestore en `services/repositorio*` y todo TMDB en `services/tmdb*`, sin llamadas desde pantallas. Esto es también la tarea 4 del estudio de la API.
6. **Chats y Match nuevos (D2, D3)** sobre el modelo seguro: votos por usuario y mazo generado una vez y guardado en la partida, para que todos vean las mismas pelis.
7. **Social (D4):** buscador por prefijo de `username_servido` con `limit`. Feed de amigos con consultas acotadas y caché.
8. **Formato:** `eslint --fix` y `prettier` en un commit aparte, sin cambios de lógica, para que el diff de los demás se lea bien.
9. **i18n:** decidir si la 3.0 sale solo en español y el README lo dice, o si se traduce. Recomiendo **solo español en la 3.0**.

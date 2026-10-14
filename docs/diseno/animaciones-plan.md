# Lavado de cara de animaciones · análisis (14-10-2026)

Análisis con *find-animation-opportunities* sobre `src/` antes de programar. Filtro: frecuencia →
propósito → velocidad → función. Todo con Reanimated en el hilo de UI, interrumpible, con
«reducir movimiento» (fundido o nada) y hápticos solo donde hay compromiso.

Vocabulario de curvas (el mismo del Match): salida `Easing.bezier(0.23, 1, 0.32, 1)`; muelles
`{ duration, dampingRatio }`; referencia de marca 260 ms y `cubic-bezier(.2,.8,.2,1.2)`.

## Parte 1 · Dónde sí (por impacto)

| # | Dónde | Hoy | Propósito | Frecuencia | Movimiento propuesto | Horas |
|---|---|---|---|---|---|---|
| 1 | `MovieRatingModal.tsx:79` estrellas | Se pintan sin respuesta; solo se toca una a una | Feedback | Varias al día | Arrastrar el dedo por la fila (Gesture.Pan) va llenando: la estrella bajo el dedo a `scale 1.25`, las demás se llenan con muelle `{duration 260, dampingRatio 0.55}` escalonado 30 ms; `Haptics.selectionAsync` al pasar a otra estrella; al soltar, todas a `scale 1` con `{duration 300, dampingRatio 0.8}`. Tocar sigue valiendo. Reducir movimiento: sin escala, cambio de color en 120 ms | 2 |
| 2 | Botones de toda la app (`Pressable` sin respuesta: MovieActions, botones principales, filas) | Ninguna respuesta al pulsar | Feedback | Decenas al día | Componente `Pulsable`: `scale 0.97` al tocar (120 ms, salida) y vuelta con muelle `{duration 300, dampingRatio 0.7}`; responde al tocar, no al soltar. Ya existe en el Match (`BotonRedondo`) | 2 |
| 3 | Hojas (`HojaAcciones:33`, `HojaDenuncia:91`, `HojaCuandoVista:28`, selector de pelis, filtros) | `Modal` con `fade`: la hoja aparece sin venir de ningún sitio | Coherencia espacial | Ocasional | Una `HojaBase` común: fondo que se funde (200 ms) y hoja que sube desde abajo con muelle `{duration 300, dampingRatio 0.85}` (`translateY: '100%'` → 0); sale por el mismo borde (220 ms, salida); arrastrar hacia abajo para cerrar (por velocidad o distancia). Reducir movimiento: solo fundido | 2,5 |
| 4 | `MovieActions.tsx:46-89` Por ver / Vista | Cambia de estado de golpe | Indicación de estado | Varias al día | El icono cambia con un cruce: el viejo sale a `scale 0.8, opacity 0` y el nuevo entra desde `scale 0.8` con muelle `{duration 260, dampingRatio 0.6}`; el fondo cambia de color en 200 ms; `Haptics.impactAsync(Light)` al guardar | 1 |
| 5 | `RootNavigator.tsx:88` abrir ficha, actor, chat | Todas las pantallas con `animation: 'fade'` | Coherencia espacial | Decenas al día | Las pantallas de detalle (Película, Actor, Conversación, Biblioteca de amigo…) con la transición nativa del sistema (`animation: 'default'`): te dice que has entrado «dentro». Las de configuración/hoja (Match, ajustes de cuenta) se quedan como están. Reducir movimiento: `fade` | 0,5 |
| 6 | `SolicitudesScreen.tsx` aceptar / rechazar | La fila desaparece de golpe y las demás saltan | Evitar un cambio brusco | Ocasional | Salida de la fila `FadeOut.duration(180)` + `LinearTransition` (muelle `{duration 300, dampingRatio 0.85}`) para que las demás suban; `Haptics.notificationAsync(Success)` al aceptar | 1 |
| 7 | `ConversacionScreen.tsx` enviar mensaje | Mi bocadillo aparece de golpe | Feedback | Decenas al día | Solo el último mensaje propio: `opacity 0 → 1` y `translateY 8 → 0` en 160 ms (salida). Casi imperceptible, como corresponde a la frecuencia. Sin háptico (se envía decenas de veces) | 1 |

**Total: unas 10 horas.**

## Parte 2 · Dónde no (y por qué)

- **Cambiar de pestaña** (`MainScreen.tsx:74`). Rechazado: se hace cientos de veces; las pestañas son hermanas, no capas. Cambio instantáneo (como ahora). La pastilla de la barra ya se desliza, y basta.
- **Entrada de los carteles en Descubrir y Biblioteca** (escalonados). Rechazado: decenas de veces al día y es contenido que el usuario quiere leer ya; los esqueletos ya hacen de puente.
- **Animar los mensajes que llegan de otros**. Rechazado: el chat es para leer; que se muevan estorba. Solo el propio al enviarlo (punto 7).
- **Contadores de no leídos que saltan o laten**. Rechazado: información, no celebración; llamar la atención con movimiento cansa.
- **Cambiar de sección en Social o Biblioteca** (segmentos). Rechazado: alta frecuencia y es navegación; cambio instantáneo.

## Parte 3 · Veredicto

La app no necesita movimiento en todas partes: necesita **respuesta**. El mayor impacto está en el
punto 2 (todo botón contesta al tocarlo), porque se nota en cada pantalla, y en el 1 (las
estrellas), que es lo que Álvaro nombra. Con los 7 puntos, la app «contesta» en todo lo que se toca a
diario sin hacer esperar a nadie; lo raro (celebraciones) ya tiene su momento en el Match.

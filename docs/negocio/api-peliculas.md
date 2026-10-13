# API de películas: qué podemos hacer hoy y antes de ganar dinero

> 13 de octubre de 2026 · Estudio del encargo 3.0 · Sin código.
>
> ✔️ = leído en la web oficial del servicio. ❓ = no confirmado en fuente oficial.

## Resumen

- **Mientras VeoVeo sea gratis y sin anuncios, seguimos con TMDB.** Es gratis para uso no comercial, tiene la mejor cobertura en español y ya trae "dónde ver" (de JustWatch).
- **Antes de poner anuncios, suscripción o cobrar por la app, hay que firmar un acuerdo comercial con TMDB.** No tiene precio publicado: se pide por un formulario. Ninguna alternativa evita ese paso a un precio razonable.
- **Ya mismo, sin monetizar,** nos faltan dos atribuciones: la de **JustWatch** en los datos de plataformas, y el logo de TMDB con la frase exacta de los términos.

## 1. TMDB: términos actuales ✔️

Fuente: [Términos de uso de la API de TMDB](https://www.themoviedb.org/api-terms-of-use), última actualización del 20 de octubre de 2023.

### Qué permite gratis

- Licencia **no exclusiva y solo para uso no comercial** (§1.A), con la condición de cumplir los términos y poner la atribución.
- Una app gratuita en Google Play, sin anuncios ni pagos, encaja aquí. Los términos no prohíben publicar en tiendas.

### Qué cuenta como comercial (§2.A)

Necesita un **acuerdo por escrito con TMDB**, que puede tener coste:
- **Cobrar por la app** o venderla.
- **Anuncios:** usar TMDB para atraer tráfico o generar ingresos con publicidad.
- **Suscripciones:** cobrar por acceder a contenido o recomendaciones ligadas a TMDB.
- **IA:** entrenar o validar modelos de IA con contenido de TMDB.

### Cómo se pide la licencia

- Por el formulario de [API for Business](https://www.themoviedb.org/api-for-business): nombre, correo, empresa, web y qué queremos hacer.
- **No hay precios publicados.** Fuentes de terceros dicen que se negocia caso a caso ([zuplo](https://zuplo.com/learning-center/best-movie-api-imdb-vs-omdb-vs-tmdb)) ❓.

### Obligaciones

- **Atribución (§3):** el **logo de TMDB**, menos destacado que el nuestro, y el aviso: *"This [application] uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB."* En español: *"Esta aplicación usa TMDB y sus API, pero TMDB no la respalda, certifica ni aprueba."*
  - Hoy Ajustes solo lleva una versión antigua de la frase, en inglés y sin logo. Tarea B4 de Google Play.
- **Caché (§1.C):** no guardar datos de TMDB **más de 6 meses**.
  - Nos afecta: la biblioteca guarda título, póster y plataformas de cada peli.
  - Propuesta: guardar en Firestore solo el id, y refrescar o caducar lo demás. Como mínimo, apuntar `actualizadoEn` y refrescar lo que tenga más de 6 meses.
- **Uso razonable:** no hay límite numérico publicado, pero pueden cortar el acceso por "uso excesivo" (§1.C). Las ~168 llamadas al arrancar de la auditoría no ayudan; se corrigen en B1.
- **Pueden terminar la licencia cuando quieran (§1.D).** Si lo hacen, hay que borrar todo lo guardado. Por eso conviene poder cambiar de API (sección 4).
- **"Dónde ver" (JustWatch):** la [documentación oficial](https://developer.themoviedb.org/reference/movie-watch-providers) dice: *"In order to use this data you must attribute the source of the data as JustWatch."* **Hoy no lo hacemos.** Hay que añadir "Datos de plataformas: JustWatch" junto a las plataformas de la ficha y en Acerca de.

## 2. Alternativas

| API | Precio | Uso comercial | Español | Dónde ver | Fuente |
|---|---|---|---|---|---|
| **TMDB** | Gratis no comercial; el comercial se negocia | Con acuerdo escrito | ✅ Muy buena (títulos, sinopsis y pósters en es-ES) | ✅ Incluido (JustWatch, con atribución) | ✔️ |
| **OMDb** | Gratis, 1.000 peticiones al día; plan de patrocinio en Patreon | ❓ El contenido es **CC BY-NC 4.0** (no comercial) | ❌ Sobre todo en inglés | ❌ | ✔️ [omdbapi.com](https://www.omdbapi.com/apikey.aspx) |
| **Watchmode** | Gratis: 2.500 al mes, 3 países, no comercial. **Startup 349 $ al mes** (40.000). Business 599 $ al mes | ✅ En planes de pago | Datos de streaming, no fichas en español | ✅ Su punto fuerte; incluye España | ✔️ [api.watchmode.com](https://api.watchmode.com/) |
| **TheTVDB** | **Gratis si la empresa factura menos de 50.000 $ al año**; luego 1.000 $ al año (hasta 250.000 $) y 10.000 $ al año (hasta 1 M$) | ✅ Por tramos de facturación, con atribución y enlace | ❓ Centrada en series; no dice si cubre películas | ❌ | ✔️ [thetvdb.com](https://thetvdb.com/api-information) |
| **Trakt** | Gratis con clave | ❓ No he encontrado sus términos oficiales | Datos en inglés; **no sirve imágenes** (se suelen tomar de TMDB) ❓ | ❌ | ❓ |

**Conclusión:**
- **OMDb** es no comercial y en inglés: no sirve.
- **Watchmode** solo cubre "dónde ver" y es caro.
- **TheTVDB** es el único con precio comercial claro y gratis para empresas pequeñas, pero está pensada para series y no confirma cobertura de películas.
- **Trakt** depende de TMDB para las imágenes.

**Ninguna sustituye a TMDB para una app de películas en español.**

## 3. Recomendación

1. **Ahora (3.0, gratis y sin anuncios):** seguir con TMDB y cumplir lo que falta:
   - logo de TMDB y frase exacta en Acerca de (y en la ficha de la tienda);
   - atribución a JustWatch en las plataformas;
   - caducidad de 6 meses en los datos guardados;
   - menos llamadas al arrancar (B1).
2. **Antes de monetizar** (anuncios, suscripción o pago):
   - Pedir la licencia comercial a TMDB con el formulario de API for Business, explicando el modelo previsto (anuncios o suscripción), el número de usuarios activos y el uso: catálogo, imágenes y dónde ver.
   - Pedir el precio por escrito.
   - Preguntar también si su licencia cubre los datos de JustWatch o si hay que hablar con JustWatch aparte.
   - Si el precio no encaja, evaluar entonces TheTVDB para metadatos, si confirma películas, y Watchmode para "dónde ver", sabiendo que la cobertura en español empeora.
3. **No poner anuncios ni cobrar hasta tener el acuerdo firmado.**

## 4. Código preparado para cambiar de API

- **Hoy:** casi todo pasa por `services/tmdbClient.ts`, pero hay llamadas a `tmdbApi` desde pantallas (`MovieMatchScreen`, `BibliotecaTab`) y URLs de imagen montadas a mano (`ChatDetailScreen`). Ver la auditoría, sección 3.
- **En la Fase B:**
  - `services/tmdb/` con un **contrato propio** (`PeliculasApi`: buscar, detalles, listas, recomendaciones, dónde ver, imágenes) y la implementación TMDB detrás.
  - Las pantallas y los hooks solo usan ese contrato y los tipos propios de VeoVeo (`Pelicula`, `Persona`…), nunca la forma de las respuestas de TMDB.
  - Las URL de imagen, solo desde una función del módulo.
  - Firestore guarda el **id de TMDB** y lo mínimo para pintar, con fecha de actualización.

# Limitaciones de seguridad conocidas (VeoVeo 3.0)

> 13 de octubre de 2026 · Aceptadas de forma consciente por el coste cero (plan Spark, sin Cloud Functions). Cada una dice qué protege de verdad y cómo se arreglaría con presupuesto.

## 1. El token de avisos lo pueden leer tus amigos

- **Qué pasa:** los avisos (mensajes, Match) los envía el móvil de quien escribe, directamente a la API pública de Expo. Para eso necesita el `pushToken` del destinatario, que está en `usuarios/{uid}/privado/avisos` y solo pueden leer el dueño y sus amigos.
- **Riesgo:** un token de Expo basta para mandar una notificación a ese móvil sin ninguna clave. Un amigo con conocimientos técnicos podría enviarte avisos falsos que parezcan de VeoVeo.
- **Qué lo limita:** solo tus amigos (amistad en los dos sentidos) pueden leer tu token. Quitarle de amigos o bloquearle se lo quita.
- **Arreglo con presupuesto:** enviar los avisos desde una Cloud Function (plan Blaze) con un *access token* de Expo y la «seguridad mejorada de push» activada. Así ningún móvil necesita el token de otro.
- **Sin coste, no hay alternativa limpia:** cualquier forma de avisar sin servidor exige que el móvil emisor tenga algo que permita notificar al receptor.

## 2. Las coincidencias del Movie Match las calcula el móvil

- **Qué pasa:** cada participante solo puede escribir **sus** votos (`matches/{id}/votos/{uid}`), y eso sí lo garantizan las reglas. Pero quien registra una coincidencia en la partida es el móvil que la detecta, y las reglas no pueden comprobar que de verdad todos votaron que sí.
- **Riesgo:** un participante con conocimientos técnicos podría añadir una coincidencia falsa a una partida en la que juega. Impacto: una peli de más en el resultado del juego.
- **Arreglo con presupuesto:** calcular las coincidencias en una Cloud Function al escribir cada voto.

## 3. Bloquear no te oculta del buscador de quien bloqueaste

- **Qué pasa:** la lista de bloqueados es privada (`privado/cuenta`). La app oculta en tu buscador a quien **tú** has bloqueado. Pero el bloqueado no puede saber que le bloqueaste (esa lista no se puede leer sin exponerla), así que él todavía puede encontrarte por tu nombre exacto o tu código.
- **Lo que sí garantizan las reglas:** un bloqueado **no puede** enviarte solicitud, escribirte en un chat individual ni meterte en un Match. Además, al bloquear se rompe la amistad, así que tampoco ve tu biblioteca ni tu token.
- **Arreglo con presupuesto:** buscador servido por una función que conozca los bloqueos.

## 4. Buscar personas

- **Decisión:** se busca por **nombre de usuario exacto** o por **código de amigo**, con una consulta puntual (`limit` pequeño). No hay listado ni búsqueda por prefijo.
- **Garantía en las reglas:** `list` sobre `usuarios` solo con `limit ≤ 30`, así que nadie puede descargarse la colección entera de una vez.
- **Lo que no impiden:** alguien muy insistente podría probar nombres uno a uno. El perfil público solo tiene nombre, foto, bio y estado (el correo está en `privado/cuenta`).

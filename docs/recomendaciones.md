# "Recomendado para ti": cómo funciona

> Código: `src/services/recomendaciones.ts`, conectado en `src/hooks/useDescubrir.ts` (`useRecomendaciones`).

## Qué pretende

Enseñar pelis que de verdad te pueden gustar, decir **por qué** y gastar pocas llamadas a TMDB y pocas lecturas de Firestore (plan Spark).

## Paso a paso

1. **Semillas.**
   - Se cogen tus pelis **vistas con 4 o 5 estrellas**. Si tienes menos de 2, también las de 3.
   - Se ordenan por nota y, a igual nota, por la fecha en que las viste.
   - De las 8 primeras se usan **4 cada día**, rotando con el día del año. Así la lista cambia de un día a otro sin dejar de partir de lo que te gusta.
2. **Candidatas de TMDB.**
   - Las `recommendations` de cada semilla, o sus `similar` si no hay recomendaciones.
   - Cada candidata suma `peso de la semilla × (1 − posición/40)`.
   - Peso de la semilla: 5 ⭐ = 1, 4 ⭐ = 0,75, 3 ⭐ = 0,4.
   - Motivo: *"Porque te gustó Dune"*.
3. **Director y actor.**
   - Con los créditos de las semillas se busca el **director** y el **actor principal** que más se repiten.
   - Se añaden sus pelis mejor valoradas (+0,6) y más populares (+0,45).
   - Motivo: *"Porque te gusta Villeneuve"*.
4. **Amigos.**
   - Lo que tus amigos han valorado con **4 o 5 estrellas** suma `0,5 + 0,35 × número de amigos` (hasta 4).
   - Motivo: *"A Laura le encantó"* o *"A 3 amigos les encanta"*.
5. **Géneros.** +0,1 por cada género que coincida con los de tus semillas (hasta 3).
6. **Variedad.** Un pequeño ruido (hasta +0,15), el mismo durante todo el día, para que el orden no sea siempre idéntico.
7. **Fuera.** Todo lo que ya tienes en tu biblioteca (Vistas y Por ver) y las pelis sin póster.
8. **Resultado.**
   - Las 30 con más puntos, con un máximo de 8 por motivo para que una sola semilla no acapare la lista.
   - El motivo que se enseña es el que más puntos ha aportado.

Si no hay semillas ni amigos con favoritas, el carrusel lo explica: *"Valora con 4 o 5 estrellas las pelis que hayas visto y aquí te recomendaremos otras."*

## Coste

| Qué | Cuánto |
|---|---|
| Llamadas a TMDB | ~14 por cálculo: 4 recomendaciones, 4 detalles, 4 créditos, director y actor. Detalles y créditos se cachean en memoria. |
| Lecturas de Firestore | Hasta 21: tu perfil, hasta 10 perfiles de amigos y hasta 10 favoritas de cada uno (consulta con `limit`), más los `get` de las reglas. |
| Frecuencia | Como mucho **cada 12 horas**, o al cambiar el día o tus semillas (porque valoras algo nuevo). El resultado se guarda en el móvil. |

## Pendiente

- **"Descartado":** aún no existe una acción de "no me interesa". Cuando la haya (por ejemplo, deslizar a la izquierda en el Match), se excluirá aquí.
- **Gustos de grupo para el Movie Match (D3):** reutilizar este cálculo con las semillas de todos los participantes.

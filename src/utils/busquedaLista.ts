/**
 * Búsqueda que perdona faltas: «forest gamp» encuentra «Forrest Gump».
 *
 * TMDB aguanta algún error, pero poco. Cuando no devuelve nada, se busca otra vez con el texto
 * corregido: se compara lo escrito con un vocabulario de títulos (los del propio usuario y los
 * que TMDB ya ha devuelto antes) y se cambia cada palabra por la más parecida.
 *
 * La comparación es por distancia de edición (cuántas letras hay que cambiar), sin tildes ni
 * mayúsculas, con un margen según lo larga que sea la palabra: corta, 1 fallo; media, 2; larga, 3.
 */

/** Sin tildes, en minúsculas y sin signos: «¿Qué Pasó Ayer?» → «que paso ayer» */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cuántas letras hay que cambiar para pasar de `a` a `b` (se corta en `tope`). */
export function distancia(a: string, b: string, tope = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > tope) return tope + 1;
  // Una fila a la vez: no hace falta guardar la tabla entera
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    let mejorDeLaFila = i;
    for (let j = 1; j <= b.length; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(anterior[j] + 1, actual[j - 1] + 1, anterior[j - 1] + coste);
      actual.push(v);
      if (v < mejorDeLaFila) mejorDeLaFila = v;
    }
    if (mejorDeLaFila > tope) return tope + 1; // ya no puede bajar del tope
    anterior = actual;
  }
  return anterior[b.length];
}

/** Margen de fallos permitido según lo larga que sea la palabra. */
function margen(palabra: string): number {
  if (palabra.length <= 4) return 1;
  if (palabra.length <= 7) return 2;
  return 3;
}

/**
 * Corrige el texto con el vocabulario dado. Devuelve null si no cambia nada (no hay nada que
 * reintentar). Las palabras que ya están en el vocabulario no se tocan.
 */
export function corregir(texto: string, vocabulario: Iterable<string>): string | null {
  const palabras = normalizar(texto).split(' ').filter(Boolean);
  if (palabras.length === 0) return null;

  const conocidas = new Set<string>();
  for (const titulo of vocabulario) {
    for (const p of normalizar(titulo).split(' ')) {
      if (p.length >= 3) conocidas.add(p);
    }
  }
  if (conocidas.size === 0) return null;

  let cambiada = false;
  const corregidas = palabras.map((palabra) => {
    if (palabra.length < 3 || conocidas.has(palabra)) return palabra;
    const tope = margen(palabra);
    let mejor = palabra;
    let mejorDistancia = tope + 1;
    for (const candidata of conocidas) {
      const d = distancia(palabra, candidata, tope);
      if (d < mejorDistancia) {
        mejorDistancia = d;
        mejor = candidata;
        if (d === 1) break; // ya es suficientemente buena
      }
    }
    if (mejorDistancia <= tope && mejor !== palabra) {
      cambiada = true;
      return mejor;
    }
    return palabra;
  });

  return cambiada ? corregidas.join(' ') : null;
}

/**
 * Deja dist/ listo para Vercel tras `expo export --platform web`.
 *   node scripts/web/preparar-export.mjs [carpeta]
 *
 * 1. Vercel descarta al subir cualquier carpeta node_modules, y Expo guarda ahí las fuentes
 *    (assets/node_modules/...). Sin esto, Montserrat e Ionicons dan HTML y Safari pone su serif.
 * 2. Quita los paquetes de JS antiguos que trae public/_expo y no usa index.html.
 */
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const js = path.join(dist, '_expo', 'static', 'js', 'web');
const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="[^"]*\/(index-[0-9a-f]+\.js)"/g)].map((m) => m[1]);
if (scripts.length !== 1) throw new Error(`index.html debe cargar un solo paquete y carga ${scripts.length}`);

for (const archivo of readdirSync(js)) {
  if (!scripts.includes(archivo)) rmSync(path.join(js, archivo));
}

const origen = path.join(dist, 'assets', 'node_modules');
if (existsSync(origen)) renameSync(origen, path.join(dist, 'assets', 'vendor'));
const paquete = path.join(js, scripts[0]);
const codigo = readFileSync(paquete, 'utf8');
if (!codigo.includes('assets/vendor') && !codigo.includes('assets/node_modules')) {
  throw new Error('El paquete no referencia las fuentes: revisa la ruta de los assets');
}
writeFileSync(paquete, codigo.replaceAll('assets/node_modules/', 'assets/vendor/'));
console.log(`Listo: ${scripts[0]}, fuentes en assets/vendor`);

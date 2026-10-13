/**
 * Crea en PRODUCCIÓN las 3 cuentas de prueba de VeoVeo 3.0 (OK de Álvaro, 13-10-2026).
 * Solo crea usuarios de Auth con el correo ya verificado; el perfil lo crea la app al entrar.
 * Las contraseñas (aleatorias) se guardan FUERA del repo, en DripDev/_copias/veoveo/.
 * Si una cuenta ya existe, no la toca. Se borran antes de publicar (docs/pruebas/cuentas.md).
 *
 *   node scripts/crear-cuentas-prueba.mjs
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = path.resolve(raiz, '..', '..', '_copias', 'veoveo');
const archivo = path.join(carpeta, 'cuentas-prueba.txt');
if (archivo.startsWith(raiz + path.sep)) throw new Error('Las contraseñas tienen que quedar fuera del repositorio.');

const clave = JSON.parse(readFileSync(path.join(raiz, 'veoveo-48667-firebase-adminsdk-fbsvc-78adfe1091.json'), 'utf8'));
initializeApp({ credential: cert(clave) });
const auth = getAuth();
mkdirSync(carpeta, { recursive: true });

for (const n of [1, 2, 3]) {
  const email = `veoveo.prueba${n}@dripdev.dev`;
  try {
    const u = await auth.getUserByEmail(email);
    console.log(`${email} ya existía (uid ${u.uid}); no se toca.`);
    continue;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  const contrasena = randomBytes(12).toString('base64url');
  const u = await auth.createUser({ email, password: contrasena, displayName: `Prueba ${n}`, emailVerified: true });
  appendFileSync(archivo, `${email}\t${contrasena}\t${u.uid}\n`);
  console.log(`${email} creada (uid ${u.uid}).`);
}
console.log(`Contraseñas en ${archivo}`);

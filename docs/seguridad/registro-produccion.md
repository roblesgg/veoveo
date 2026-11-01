# Registro de cambios en producción (Firebase `veoveo-48667`)

Cada cambio en producción, con quién lo hizo y con qué OK. Lo que no esté aquí no se ha hecho.
Los datos personales no se apuntan aquí (norma 28).

| Fecha | Cambio | Quién | OK |
|---|---|---|---|
| 13-10-2026 | Creadas 3 cuentas de Auth con el correo verificado: `veoveo.prueba1@`, `prueba2@` y `prueba3@dripdev.dev` (`scripts/crear-cuentas-prueba.mjs`). Contraseñas en `DripDev/_copias/veoveo/`. | Agente VeoVeo | Álvaro, en el chat del agente |
| 13-10-2026 | Simulación de la migración 3.0 en **solo lectura** (sin escrituras). | Agente VeoVeo | Álvaro, en el chat del agente |
| 13-10-2026 | Firestore `(default)`: **protección contra borrado activada** (`deleteProtectionState = DELETE_PROTECTION_ENABLED`). | Jefe de Proyectos | Álvaro, expreso |
| 14-10-2026 | Borradas `prueba1` y `prueba2` (Auth; no tenían datos). `prueba3` pasa a cuenta de revisión de Play: perfil «Revisor VeoVeo» (sin solicitudes) y biblioteca de ejemplo (`scripts/cuentas-prueba-produccion.mjs`). | Agente VeoVeo | Álvaro, en el chat del agente |
| 01-11-2026 | **Publicación de la 3.0 en la web** (`veoveo.dripdev.dev`, proyecto de Vercel `veo-veo`, por CLI): copia y migración 3.0 (19 perfiles, 18 con datos privados, 2 solicitudes copiadas, 4 chats, 27 matches cancelados), reglas e índices de Firestore. Copia en `DripDev/_copias/veoveo/migracion-3.0-2026-11-01T21-14-34-787Z/`; **borrarla el 01-12-2026**. Storage no está activado en el proyecto y la 3.0 no sube archivos: sus reglas no se han subido. `min_version` sin cambiar. | Jefe de Proyectos | Álvaro, expreso («yo te autorizo, adelante, hazlo»), con los recuentos delante |
| 01-11-2026 | **APK 3.0.0 (42) publicado** en GitHub (release `v3.0.0`), firmado con la upload key, y **actualización obligatoria**: `configuracion/app.min_version` = 3.0.0, con aviso de desinstalar antes (la firma cambia respecto a la 2.0.4). SHA-1 de la upload key registrada en la app Android de Firebase. | Jefe de Proyectos | Álvaro, expreso («lánzalo en todos como actualización obligatoria») |

## Decisiones que no son cambios

- **PITR (recuperación a un momento dado) sigue desactivado a propósito:** necesita el plan Blaze y
  cuesta dinero. Lo suple la copia de seguridad obligatoria que hace el script de migración antes
  de escribir nada.
- La base de datos está en `eur3` (Unión Europea), como dice la política de privacidad.

## Pendiente (cada uno necesita el OK de Álvaro en su momento)

- Migración 3.0, reglas e índices, y `min_version`: solo en el orden de
  `docs/encargos/2026-10-13-veoveo-3.md` → «Secuencia de publicación».
- Borrar la copia de seguridad de la migración **30 días después** de ejecutarla (fecha exacta en
  el encargo, al ejecutar).

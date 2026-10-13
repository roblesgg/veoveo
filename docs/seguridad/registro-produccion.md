# Registro de cambios en producción (Firebase `veoveo-48667`)

Cada cambio en producción, con quién lo hizo y con qué OK. Lo que no esté aquí no se ha hecho.
Los datos personales no se apuntan aquí (norma 28).

| Fecha | Cambio | Quién | OK |
|---|---|---|---|
| 13-10-2026 | Creadas 3 cuentas de Auth con el correo verificado: `veoveo.prueba1@`, `prueba2@` y `prueba3@dripdev.dev` (`scripts/crear-cuentas-prueba.mjs`). Contraseñas en `DripDev/_copias/veoveo/`. | Agente VeoVeo | Álvaro, en el chat del agente |
| 13-10-2026 | Simulación de la migración 3.0 en **solo lectura** (sin escrituras). | Agente VeoVeo | Álvaro, en el chat del agente |
| 13-10-2026 | Firestore `(default)`: **protección contra borrado activada** (`deleteProtectionState = DELETE_PROTECTION_ENABLED`). | Jefe de Proyectos | Álvaro, expreso |

## Decisiones que no son cambios

- **PITR (recuperación a un momento dado) sigue desactivado a propósito:** necesita el plan Blaze y
  cuesta dinero. Lo suple la copia de seguridad obligatoria que hace el script de migración antes
  de escribir nada.
- La base de datos está en `eur3` (Unión Europea), como dice la política de privacidad.

## Pendiente (cada uno necesita el OK de Álvaro en su momento)

- Borrar `prueba1` y `prueba2` antes de publicar. **`prueba3` NO se borra:** es la cuenta para
  los revisores de Google Play (contraseña nueva y datos de ejemplo, sin datos de nadie real).
- Migración 3.0, reglas e índices, y `min_version`: solo en el orden de
  `docs/encargos/2026-10-13-veoveo-3.md` → «Secuencia de publicación».
- Borrar la copia de seguridad de la migración **30 días después** de ejecutarla (fecha exacta en
  el encargo, al ejecutar).

# QA — verificación determinista (ENGINE-04)

Este repositorio declara sus etapas de verificación en `qa/qa-manifest.json` para que
cualquier entrega pueda validarse de forma determinista y content-bound.

## Uso

```powershell
# 1. Validar el manifiesto
node $DSH_HOME/engine-04/tools/qa-evidence.mjs manifest-check --worktree .

# 2. Ejecutar todas las etapas y escribir la evidencia fuera del árbol de trabajo.
#    El worktree DEBE estar registrado con ENGINE-03 (lifecycle record) o el gate
#    no puede establecer identidad de repositorio.
node $DSH_HOME/engine-04/tools/qa-evidence.mjs verify --worktree <worktree> --workspace-root <workspace> --baseline <commit> --out <evidencia>.json

# 3. Auditar y decidir el gate
node $DSH_HOME/engine-04/tools/qa-evidence.mjs audit --evidence <evidencia>.json
node $DSH_HOME/engine-04/tools/qa-evidence.mjs gate --evidence <evidencia>.json
```

El gate devuelve `PASS` sólo si cada etapa requerida se ejecutó de verdad (argv, cwd,
exit code y duración registrados), terminó con 0, el árbol no cambió durante la
ejecución y la evidencia de revisión sigue casando con los bytes entregados.

### Requisitos de contexto del gate (medidos, no supuestos)

1. **Worktree registrado en ENGINE-03.** Sin `record` de ciclo de vida el gate responde
   `BLOCKED` con `trusted-repository-context`; el registro lo crea
   `parallel-dev.mjs create`/`adopt`, no un fichero a mano.
2. **`--baseline` igual al `baseline` del registro**, si no aparece la contradicción
   `trusted-baseline`. Para verificar el cambio real entregado, el registro debe apuntar
   al commit base de la entrega.
3. **`--team <team.json>`** con el estado de AgentTeams; sin él, `team-required` bloquea
   aunque todas las etapas pasen.
4. **Escaneo completo.** El motor recorre el worktree hasta un tope de 2000 artefactos
   (excluye `.git`, `node_modules`, `dist`, `coverage`, `.nx` si está en la lista de
   segmentos). Un worktree con cachés locales pesadas produce `complete-scan` y el gate
   queda `BLOCKED`: no es un fallo del código, es scope parcial.
5. **`dist/` y `node_modules/` presentes en el worktree verificado**: las etapas
   `integration-*` arrancan el bundle construido y `typecheck` usa `node_modules`.

## Etapas declaradas

| Etapa | Qué prueba | Requerida |
|---|---|---|
| `typecheck` | `tsc` sobre `web-ssr/tsconfig.app.json` | sí |
| `schema-invariants` | invariantes del esquema SQL de nieve | sí |
| `unit-snow` | suite `node:test` del módulo `web-ssr/src/snow/tests` | sí |
| `build-production` | build Angular SSR de producción sin caché de Nx | **no** (ver limitaciones) |
| `integration-http` | los 16 endpoints contra el bundle real | sí |
| `persistence-restart` | escritura → disco → SIGKILL → reinicio → lectura | sí |
| `adversarial` | matriz de casos límite y hostiles | sí |
| `security-http` | auth fail-closed, límites de tasa, no filtrado | sí |
| `captain-http` | batería independiente del coordinador (incluye `liftsOpen === 12`) | sí |
| `reviewer-security` | sonda independiente del revisor sobre el bundle | sí |

## Limitaciones medidas del entorno (no son opiniones)

| Limitación | Medición | Consecuencia |
|---|---|---|
| El runner deniega **pipes** a los procesos hijos | `confined-identity.mjs`: `spawn stdio inherit → ok`, `ignore → ok`, `pipe → EPERM` | Todos los drivers lanzan hijos con `scripts/snow02/lib/child.mjs` (sin pipes). |
| **Nx y el Angular CLI no arrancan** bajo el sandbox | `confined-identity.mjs`: control `node -e` = 0, `nx show projects` = 1, `ng build` = 1, escritura de ficheros = ok | `build-production` queda **no requerida** en el manifiesto; el build se verifica fuera del runner (exit 0 con `--skip-nx-cache`, re-ejecutado por capitán y revisor) y las etapas de integración consumen el `dist/` que ese build produce. |
| La captura de salida del runner descarta las líneas iniciales | Comparación de `outputTail` con la salida directa del mismo comando | Los diagnósticos escriben un resumen de una línea y codifican el resultado en el *exit code*. |
| `leak-guard` compara `%TEMP%` al arrancar y al salir | Proceso ajeno del host escribiendo en el `TEMP` compartido | Ejecutar con `TMP`/`TEMP` apuntando a un directorio propio. |
| `.nx/workspace-data` cambia durante `verify` | `duringDrift` en la evidencia | Ejecutar `verify` con `NX_DAEMON=false` o sobre un árbol sin actividad de Nx. |

## Condiciones del entorno que las etapas asumen

- **Node 24** (probado con `v24.18.0`): la suite usa el *type stripping* nativo con
  `--experimental-transform-types` y el loader `scripts/snow/ts-loader.mjs`.
- **`--test-isolation=none`**: el aislamiento por proceso abre *stdio* pipeado, que el
  sandbox de Windows deniega (`spawn EPERM`).
- **Ficheros enumerados explícitamente** en `unit-snow`: `node --test` no acepta un
  directorio en este entorno (`ERR_UNSUPPORTED_DIR_IMPORT`). Si se añade un `*.test.ts`
  nuevo, hay que añadirlo al manifiesto; si no, no se ejecuta y el gate no lo verá.
- **`leak-guard`** compara el contenido de `%TEMP%` al arrancar y al salir: un proceso
  ajeno del host que escriba en el `TEMP` compartido lo hace fallar sin que falle ningún
  test. Ejecutar con `TMP`/`TEMP` apuntando a un directorio propio.
- Las etapas de integración arrancan `dist/web-ssr/server/server.mjs` en un puerto libre
  con `SNOW_DATA_DIR` temporal y un token canario; nunca usan credenciales reales.

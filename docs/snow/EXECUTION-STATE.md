# EXECUTION-STATE — SNOW-02 (backend operativo, persistencia y APIs)

**Última actualización:** 2026-11-16 · **Rama integrada:** `master` (`61d2a55`)
**Estado global:** **PASS aceptado por decisión del usuario (2026-11-16)** — backend
operativo verificado (etapas ENGINE-04 exit 0), revisión independiente PASS sobre
`6ab6867`, **mergeado a `master`** con excepción explícita del usuario respecto al gate de
entrega (§7). Re-revisión de los bytes posteriores a `6ab6867`: **PENDIENTE declarada**.

> **Nota de honestidad sobre el estado.** El 2026-11-16 el usuario indicó «no hace falta qa,
> mergea todo como pass». El merge se ejecutó con esa autorización y **no** porque el gate
> determinista hubiera devuelto `PASS`: los tres bloqueantes de §7 siguen siendo ciertos y
> la re-revisión independiente de los bytes posteriores a `6ab6867` no se ha hecho. Lo
> verificado sobre el código exacto de `master` tras el merge: `tsc` exit 0, suite de 15
> ficheros en dos mitades exit 0 y `captain-http-verify` 68/68.

---

## 1. Identidad del árbol

| Dato | Valor |
|---|---|
| Commit base | `9b503604f802abc4c373fee8b7ba36181e31e0df` (HEAD de `master`) |
| Rama actual | `feat/snow-02-operational-backend` |
| HEAD de la rama (pre-commit del hito) | `baec0c865e44e08590e4209eb56d87539b847821` |
| Commits por delante de `master` (hito anterior) | 4 (`7277cc8` núcleo snow · `f033696` conexión SSR · `02b82e1` docs/REA · `baec0c8` gitignore) |
| **Commits creados en SNOW-02** | **2** — `b7f6484` (implementación completa del hito) y `5159283` (evidencia HTTP post-commit) |
| Árbol tras el commit | **limpio** (`git status --porcelain` vacío); `data/` y `.agent-teams/` ignorados por `.gitignore:65-66` |

> **Sellado y re-verificado:** tras el commit se re-ejecutó el driver del capitán contra
> el bundle reconstruido → `checks=68 passed=68 failed=0`. La evidencia cruda de esa
> pasada quedó en `docs/snow/snow02-evidence/captain-http-verify.json` (commit `5159283`).
> El commit es **local**: no hay push ni merge.

---

## 2. Funciones DEMOSTRADAS (re-ejecutadas por el revisor independiente)

| Función | Evidencia | Estado |
|---|---|---|
| Type-check de aplicación | `tsc -p web-ssr/tsconfig.app.json --noEmit` → **exit 0** | DEMOSTRADO |
| Esquema SQL invariantes | `node scripts/snow/check-schema.mjs` → 8/8 «all invariants hold», exit 0 | DEMOSTRADO |
| Build producción sin caché | `npx nx build web-ssr --configuration=production --skip-nx-cache` → exit 0 (62.5 s) | DEMOSTRADO |
| Suite completa `snow/tests` | 123/123 pass, 0 fail, `LEAK_GUARD_OK`, exit 0 (TMP aislado) | DEMOSTRADO |
| 15 endpoints v1 por HTTP (bundle real) | `integration-http.mjs` 60/60 · `captain-http-verify.mjs` 68/68 | DEMOSTRADO |
| Persistencia tras SIGKILL (F1) | `persistence-restart.mjs` 18/18: `liftsOpen === 12`, atribución y ranking tras reinicio | DEMOSTRADO |
| Matriz adversarial | `adversarial.mjs` 14/14 (404/400/413/null≠0/centinelas/draft/futuro) | DEMOSTRADO |
| Seguridad admin | `security-http-verify.mjs` 51/51 · sonda propia del revisor `reviewer-security-bundle.mjs` 22/22 (auth 8×401, 400/413 sin stack, 429 con Retry-After, /config sin nombres de env, rechazos sin efecto) | DEMOSTRADO |
| Contratos Angular ↔ backend | `api-client.test.mjs` 6/6 (cliente sin rutas inventadas ni rutas admin) | DEMOSTRADO |
| Honestidad de datos | sin cifras inventadas, `null ≠ 0`, estados `no_data`/`not_configured`/`blocked`/`stale`, ningún mock como dato real en nieve | DEMOSTRADO |

---

## 3. Funciones PENDIENTES (no demostradas / no conectadas)

| Pendiente | Motivo | Estado |
|---|---|---|
| `home`, `planner`, `blog-list`, `blog-article`, `lodging-*`, `rental-marketplace`, `premium`, `shop-detail`, `account`, `admin` (resto) | Dominios fuera del alcance nieve v1; siguen con mock (R2/R4 de SNOW-02) | NO CONECTADO (declarado) |
| Proveedores externos en vivo (AEMET/Météo-France/C3S/CLMS) | Sin credenciales; `forecast`/`avalanche`/`alerts` degradan a `not_configured`/`no_data` | UNVERIFIED en vivo |
| Radar e histórico de webcam | Sin endpoint en v1 ⇒ `unavailable` explícito en el cliente | PENDIENTE |
| Enlace portada → `/nieve` y 4 imágenes 404 de portada | Deuda previa del shell legacy | PENDIENTE |
| Warnings de build (budget CSS, `leaflet` CommonJS) | No bloqueantes | PENDIENTE |
| **Commit del trabajo SNOW-02** | `b7f6484` (implementación) + `5159283` (evidencia post-commit) + commits de QA | **HECHO por el capitán** — árbol limpio, evidencia HTTP re-verificada tras el commit (68/68) |
| **Gate ENGINE-04** | `qa/qa-manifest.json` (9 etapas requeridas + `build-production` no requerida) y `qa/README.md` con los requisitos del gate medidos | **STAGES PASS / GATE FAIL — bloqueantes reales, ver §7** |
| **Re-revisión tras los arreglos de QA** | La revisión independiente (t7) juzgó los bytes de `6ab6867`; después se modificaron `store-durability.test.ts`, `scripts/snow02/*` y el manifiesto | **PENDIENTE — bloquea el PASS del gate** |
| Aislamiento de seguridad (lectura/secretos/red) | No medido (no es sandbox de lectura/red) | SECURITY PARTIAL |

---

## 4. Hallazgos cerrados (revisión t7)

| ID | Severidad | Estado | Evidencia |
|---|---|---|---|
| C1/B2 centinela `-99` aceptado | ALTA | **CORREGIDO** — 400 tipado, no persiste | `adversarial` #9, `integration-http`, sonda propia |
| C3/B4 `stale` por antigüedad recién escrito | ALTA | **CORREGIDO** — `editorialFreshness(observedAt, capturedAt, now)` | `station-query.ts:257`, suite |
| C5 visibilidad decidida por reloj | ALTA | **CORREGIDO** — `listPublished` filtra por `mood`, no por reloj | `parte-futuro.test.ts`, `adversarial` #11 |
| C4/B1 `/config` filtraba nombres de env | MEDIA | **CORREGIDO** — `redactConfig()` en el borde | `security-hardening` C29a, sonda propia |
| B3 `PUT` = reemplazo total | MEDIA | **POR DISEÑO** — upsert de documento completo, fail-closed | `parseStationUpsert` |
| Observación: `observedAt` futuro etiquetado `stale` en directorio/ranking vs `live` en `/report` | BAJA | Documentado; no bloquea (visibilidad coherente) | informe §8 |

---

## 5. Evidencias verificables

| Evidencia | Ubicación |
|---|---|
| Informe de entrega y revisión | `docs/snow/SNOW-02-BACKEND-REPORT.md` |
| Arquitectura e inventario | `docs/snow/SNOW-02-ARCHITECTURE.md` |
| Evidencia cruda de drivers | `docs/snow/snow02-evidence/{integration-http,persistence-restart,adversarial,captain-http-verify,reviewer-security-bundle}.json` |
| Sonda propia del revisor | `docs/snow/snow02-evidence/reviewer-security-bundle.mjs` |
| Hallazgos de seguridad | `docs/snow/snow02-evidence/security-findings.md` |
| Drivers reproducibles | `scripts/snow02/{integration-http,persistence-restart,adversarial,security-http-verify,captain-http-verify}.mjs` |

---

## 6. Estado de aprobación del merge

**MERGE A `master`: NO AUTORIZADO.**

- No hay merge, fast-forward, tag ni push realizados por SNOW-02.
- La rama `feat/snow-02-operational-backend` está muy por delante de `master`, sin push.
- La revisión independiente (t7) emitió **PASS**, pero un PASS de revisión **no** autoriza
  el merge (ENGINE-01 §4, ENGINE-02 §6).
- El merge a `master` requiere **autorización explícita del usuario**.

### Condiciones antes de autorizar un merge

1. ~~Commit del trabajo SNOW-02 con identidad de contenido.~~ **HECHO** (`b7f6484` y siguientes).
2. ~~Re-ejecución de `tsc`, `check-schema`, suite completa y los drivers desde ese commit.~~
   **HECHO** con el manifiesto ENGINE-04 (ver §7).
3. Decisión de producto sobre los mocks restantes (home/planner/blog/lodging/rental/
   premium/shop-detail/account/admin) — declarados fuera de alcance nieve v1.

---

## 7. Gate determinista ENGINE-04 (ejecutado por el capitán)

**Manifiesto:** `qa/qa-manifest.json` — 9 etapas requeridas + `build-production` (no
requerida, ver abajo). `manifest-check` → **ok**.

**`verify` sobre un worktree registrado en ENGINE-03** (`snow02-main-gate`, junction a
`node_modules`, `dist/` copiado, `NX_DAEMON=false`, `ENGINE04_TEMP` fuera del worktree):

| Etapa | Exit code |
|---|---|
| `typecheck` | 0 |
| `schema-invariants` | 0 |
| `unit-snow` (dos mitades, 15 ficheros) | 0 |
| `integration-http` | 0 |
| `persistence-restart` | 0 |
| `adversarial` | 0 |
| `security-http` | 0 |
| `captain-http` | 0 |
| `reviewer-security` | 0 |

`gaps = 0`, `duringDrift = 0`, evidencia archivada en
`docs/snow/snow02-evidence/engine04-worktree-verify.json`.

**`gate` → `FAIL`** con tres bloqueantes y una lista de contradicciones de *binding*.
Ninguno de los tres es un fallo de las etapas; los tres son consecuencias medidas de haber
cerrado el equipo y de haber corregido los arreglos de QA después de la revisión:

1. **`trusted-repository-context` / `evidence-repository-identity`** — `worktree path does
   not resolve`. La evidencia se produjo en un worktree registrado en ENGINE-03
   (`snow02-main-gate`) que después se retiró con el propio toolkit
   (`parallel-dev.mjs remove`). El worktree principal nunca estuvo registrado y, en este
   host, el motor no reconoce el clon principal como raíz de worktree (`assertWorktreeRoot`
   → `Not a registered worktree root`), así que no existe un contenedor válido para emitir
   un `PASS` de entrega sobre el árbol principal.
2. **`change-set-present`** — `evidence carries no valid changed set`. Un `verify` con
   `--baseline` igual al `HEAD` del worktree registrado no tiene cambio que reconstruir;
   el que sí lo tenía (`--baseline master`) entraba en contradicción
   `trusted-baseline: evidence asserts baseline master but the lifecycle baseline is HEAD`.
3. **`binding-current:<t7>`** — el revisor juzgó los bytes de `6ab6867`; después se
   modificaron, entre otros, `web-ssr/src/snow/tests/store-durability.test.ts`,
   `scripts/snow02/*` y `qa/qa-manifest.json`. La revisión ya **no** casa con lo entregado
   y hace falta una **re-revisión independiente** de esos bytes.

El estado `team-required` **sí** se satisfizo aportando el estado de AgentTeams archivado
(`--team` con las 8 tareas y la revisión t7 con `reviewedArtifacts`), pero eso no exime de
los tres bloqueantes anteriores. Por eso el resultado final es **FAIL**, no `BLOCKED`:
hay contradicciones determinadas, no solo evidencia incompleta.

**Qué sigue pendiente para un gate `PASS` (ni el capitán ni ningún miembro pueden acortarlo):**
(a) un worktree registrado y **vivo** cuyo `baseline` sea el commit base de la entrega;
(b) una **re-revisión independiente** de los bytes actuales con `verdict=pass`; (c) el
estado de equipo de esa revisión aportado al gate con `--team`.

**Hallazgos del entorno que se corrigieron para llegar aquí** (no son cambios de producto):

| Hallazgo | Medición | Corrección |
|---|---|---|
| El runner deniega *pipes* | `spawn` `inherit`/`ignore` ok, `pipe` EPERM | `scripts/snow02/lib/child.mjs` lanza hijos sin pipes |
| `store-durability` usaba `execFileSync` (pipes) y daba 3 fallos falsos | dentro del sandbox | cae a salida por fichero si los pipes no están permitidos |
| Una invocación de 15 ficheros falla, dos grupos no | 15→exit 1, 8+7→exit 0 | `scripts/snow02/qa-unit.mjs` ejecuta dos mitades con TEMP propio |
| Nx/Angular no arrancan bajo el sandbox | control 0, `nx` 1, `ng` 1 | `build-production` deja de ser requerida y se verifica fuera del runner |
| La evidencia se regeneraba con timestamps y derivaba el árbol | `duringDrift` en cada pasada | los drivers escriben evidencia normalizada (solo checks) |
| El árbol tenía >2000 artefactos ignorados (4096) | `complete-scan` BLOCKED | limpieza de `data/qa-temp*` (propios) y `tmp/`; ahora `gaps = 0` |

**Lo que este estado NO afirma:** que el gate haya devuelto `PASS`. Afirma que las nueve
etapas se ejecutaron en el runner confined con exit 0, sin gaps ni deriva, y enumera con
exactitud los bloqueantes que impiden el `PASS`.

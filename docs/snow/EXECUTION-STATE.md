# EXECUTION-STATE — SNOW-02 (backend operativo, persistencia y APIs)

**Última actualización:** 2026-11-16 · **Rama:** `feat/snow-02-operational-backend`
**Estado:** revisión independiente **PASS** · **Merge a `master`: NO AUTORIZADO**

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
| **Commit del trabajo SNOW-02** | `b7f6484` (implementación) + `5159283` (evidencia post-commit) | **HECHO por el capitán** — árbol limpio, evidencia HTTP re-verificada tras el commit (68/68) |
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
- La rama `feat/snow-02-operational-backend` está 6 commits por delante de `master`
  (4 del hito anterior + `b7f6484` y `5159283` de SNOW-02), sin push.
- La revisión independiente (t7) emitió **PASS**, pero un PASS de revisión **no** autoriza
  el merge (ENGINE-01 §4, ENGINE-02 §6).
- El merge a `master` requiere **autorización explícita del usuario**.

### Condiciones antes de autorizar un merge

1. ~~Commit del trabajo SNOW-02 con identidad de contenido.~~ **HECHO** (`b7f6484`, `5159283`).
2. Re-ejecución de `tsc`, `check-schema`, `nx build --skip-nx-cache`, suite completa y los
   drivers desde ese commit (gate determinista ENGINE-04). **Parcial del capitán:** tras el
   commit se re-ejecutó `captain-http-verify` (68/68). El gate completo ENGINE-04 (snapshot
   `qa/qa-manifest.json` + `qa_gate`) **no** se ha ejecutado: el repo no declara manifiesto.
3. Decisión de producto sobre los mocks restantes (home/planner/blog/lodging/rental/
   premium/shop-detail/account/admin) — declarados fuera de alcance nieve v1.

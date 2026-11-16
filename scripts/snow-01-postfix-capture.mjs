/**
 * SNOW-01 — captura de verificación POST-FIX del defecto de etiquetado.
 *
 * Motivación: `station-state.component.ts` rotulaba `provenance.observedAt`
 * (instante de la PETICIÓN) como «Último parte conocido» cuando no existía
 * parte (`updatedAt: null`). El capitán lo corrigió; este script captura la
 * prueba visual en un navegador REAL de que la frase ya no se pinta y de que
 * los estados honestos («Sin datos», «Temporada cerrada») siguen presentes.
 *
 * No sustituye la QA de `browser-qa`: sólo documenta el antes/después del fix.
 *
 *   node scripts/snow-01-postfix-capture.mjs [baseUrl]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT = join(ROOT, "docs/snow/captures-snow01");
const BASE = process.argv[2] ?? "http://localhost:4012";
const CDP = process.env.CDP_ENDPOINT ?? "http://127.0.0.1:9222";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTargets() {
  const r = await fetch(`${CDP}/json/list`);
  return r.json();
}

class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve: res, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : res(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, reject) => {
      this.pending.set(id, { resolve: res, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  static async open(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", rej, { once: true });
    });
    return new Session(ws);
  }
}

async function shoot(session, url, width, height, dpr, mobile, file) {
  await session.send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: dpr, mobile,
  });
  await session.send("Page.navigate", { url });
  await sleep(2200);

  const text = await session.send("Runtime.evaluate", {
    expression: "document.body.innerText",
    returnByValue: true,
  });
  const body = text.result?.value ?? "";

  const shot = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const path = join(OUT, file);
  writeFileSync(path, Buffer.from(shot.data, "base64"));

  return {
    file,
    bytes: Buffer.from(shot.data, "base64").length,
    hasMisleadingLabel: body.includes("Último parte conocido"),
    hasHonestNoData: body.includes("Sin datos") || body.includes("SIN DATOS"),
    hasSeasonClosed: body.includes("Temporada cerrada"),
    excerpt: body.split("\n").filter(Boolean).slice(0, 12).join(" | "),
  };
}

const targets = await cdpTargets();
const page = targets.find((t) => t.type === "page");
if (!page) throw new Error("no page target en CDP");

const session = await Session.open(page.webSocketDebuggerUrl);
await session.send("Page.enable");
await session.send("Runtime.enable");

mkdirSync(OUT, { recursive: true });

const url = `${BASE}/nieve/estaciones/baqueira-beret`;
const results = [];
results.push(await shoot(session, url, 1440, 900, 1, false, "snow01-postfix-detalle-desktop.png"));
results.push(await shoot(session, url, 390, 844, 2, true, "snow01-postfix-detalle-mobile.png"));

// Contraste: la vista de directorio debe seguir intacta.
const listText = await session.send("Runtime.evaluate", {
  expression: "document.body.innerText",
  returnByValue: true,
});
await session.send("Page.navigate", { url: `${BASE}/nieve/estaciones` });
await sleep(2000);

console.log(JSON.stringify({ base: BASE, url, results }, null, 2));
for (const r of results) {
  console.log(`${r.file}  ${r.bytes} B  labelEnganosa=${r.hasMisleadingLabel}  sinDatos=${r.hasHonestNoData}  temporadaCerrada=${r.hasSeasonClosed}`);
}
session.ws.close();

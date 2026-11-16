#!/usr/bin/env node
// Read-only detail extraction: meteo controls, webcam sources/attribution, map tiles, avalanche scale.
import { readFileSync } from "node:fs";

const dir = "docs/snow/captures";
const read = (n) => readFileSync(`${dir}/${n}`, "utf8");
const uniq = (a) => [...new Set(a)];

const meteo = read("meteo-desktop-1440.dom.txt");
const selects = [...meteo.matchAll(/<select[^>]*>([\s\S]*?)<\/select>/g)];
selects.forEach((o, i) => {
  const first = (o[1].match(/<option[^>]*>([^<]*)</) ?? [])[1];
  const n = (o[1].match(/<option/g) ?? []).length;
  console.log(`meteo select${i}: options=${n} first="${first}"`);
});
console.log("meteo h1:", (meteo.match(/<h1>([\s\S]*?)<\/h1>/) ?? [])[1]?.replace(/<[^>]+>/g, ""));
console.log("meteo has 'previsi':", /previsi/i.test(meteo));
console.log("meteo webcam imgs:", (meteo.match(/class="webcam"/g) ?? []).length);

const cams = read("sala-de-webcams-desktop-1440.dom.txt");
const srcs = uniq([...cams.matchAll(/<img src="(https?:\/\/[^"]+)"/g)].map((x) => x[1]));
const hosts = {};
for (const u of srcs) {
  try { const h = new URL(u).host; hosts[h] = (hosts[h] ?? 0) + 1; } catch { /* ignore */ }
}
console.log("webcam img hosts:", JSON.stringify(hosts));
console.log("infonieve-hosted webcam pattern:", srcs.filter((u) => /infonieve\.es\/webcams\//.test(u)).slice(0, 3).join(" | "));
console.log("attribution:", uniq([...cams.matchAll(/salawebcams_author[^>]*>([^<]+)</g)].map((x) => x[1].trim())).join(", "));
console.log("camera links to station pages:", (cams.match(/salawebcams_link/g) ?? []).length);

const map = read("mapa-de-webcams-desktop-1440.dom.txt");
const tiles = uniq([...map.matchAll(/src="(https?:\/\/[^"]*(?:tile|\/6\/)[^"]*)"/g)].map((x) => x[1]));
console.log("map tiles sample:", tiles.slice(0, 2).join(" | "));
console.log("map tile count:", tiles.length);

const aludes = read("aludes-desktop-1440.dom.txt");
console.log("aludes levels:", uniq([...aludes.matchAll(/box_aludes_nivel_(\d)/g)].map((x) => x[1])).join(","));
console.log("aludes tiles:", uniq([...aludes.matchAll(/src="(https?:\/\/[^"]*tile[^"]*)"/g)].map((x) => x[1])).slice(0, 1).join(""));

const fechas = read("fechas-temporada-desktop-1440.dom.txt");
const seasons = (fechas.match(/<strong>Temporada /g) ?? []).length;
console.log("fechas: season rows:", seasons, "| current rows:", (fechas.match(/<a class="tr" href="estacion-esqui\//g) ?? []).length);
console.log("fechas: sort endpoint script present:", /fecha-inicio-fin-temporada\/', \{ sort: 1, orden/.test(fechas));

const publicar = read("publicar-desktop-1440.dom.txt");
console.log("publicar: rating labels:", uniq([...publicar.matchAll(/data-tooltip="(Penoso|Malo|Aceptable|Bueno|Excelente)"/g)].map((x) => x[1])).join(", "));
console.log("publicar: validity note:", /vigencia de (\d+) d/.test(publicar) ? publicar.match(/vigencia de (\d+) d[^.]*/)[0] : "none");

const rebaja = read("parte-de-nieve-desktop-1440.dom.txt");
const pages = uniq([...rebaja.matchAll(/"a href="([^"]+)"/g)].map((x) => x[1])).filter((u) => u.startsWith("parte-de-nieve/"));
console.log("parte-de-nieve subnav links:", pages.join(", "));

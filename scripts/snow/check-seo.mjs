#!/usr/bin/env node
// Read-only SEO/head analysis of a captured DOM (REA `dom` artifact text).
// usage: node scripts/snow/check-seo.mjs <capture.dom.txt> [...more]
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: check-seo.mjs <capture.dom.txt> [...]");
  process.exit(2);
}

const one = (re, s) => (s.match(re) ?? [""])[0];
const squash = (s) => s.replace(/\s+/g, " ").trim();

for (const file of files) {
  const s = readFileSync(file, "utf8");
  const metas = s.match(/<meta\b[^>]*>/gi) ?? [];
  const links = s.match(/<link\b[^>]*>/gi) ?? [];
  console.log(`### ${file}`);
  console.log(`title: ${squash(one(/<title>[\s\S]*?<\/title>/i, s))}`);
  console.log(`h1: ${squash(one(/<h1\b[\s\S]*?<\/h1>/i, s))}`);
  console.log(`meta count: ${metas.length}`);
  for (const t of metas) console.log(`  ${squash(t)}`);
  const canon = links.filter((l) => /rel=["'](canonical|alternate|amphtml)["']/i.test(l));
  console.log(`canonical/alternate links: ${canon.length}`);
  for (const l of canon) console.log(`  ${squash(l)}`);
  console.log(`json-ld blocks: ${(s.match(/application\/ld\+json/gi) ?? []).length}`);
  console.log(`lang attr: ${one(/<html[^>]*>/i, s)}`);
  const h2 = [...s.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => squash(m[1].replace(/<[^>]+>/g, "")));
  console.log(`h2 (${h2.length}): ${h2.slice(0, 12).join(" | ")}`);
  console.log(`scripts: ${(s.match(/<script\b/gi) ?? []).length}; jquery: ${/jquery/i.test(s)}`);
  const hosts = new Set([...s.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)].map((m) => m[1].toLowerCase()));
  console.log(`external hosts (${hosts.size}): ${[...hosts].sort().join(", ")}`);
  console.log("");
}

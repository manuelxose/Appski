// Extract the ```ts blocks from docs/snow/02-feature-matrix.md into a single module
// and type-check it with the repo's TypeScript. Read-only w.r.t. the repo docs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const md = readFileSync("docs/snow/02-feature-matrix.md", "utf8");
const blocks = [...md.matchAll(/```ts\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
console.log("ts blocks found:", blocks.length);

// Minimal ambient types for names the DTOs reference but that live in 05b / elsewhere.
const prelude = `
type LicenseStatus = 'allowed' | 'allowed-with-attribution' | 'restricted' | 'blocked' | 'unverified';
type NoDataReason = 'outside-season' | 'source-silent' | 'not-yet-published' | 'not-covered' | 'license-prohibits';
interface StationSummary { slug: string; name: string; discipline: 'alpine' | 'nordic'; }
interface OperationalStatusDto { liftsOpen: number | null; liftsTotal: number | null; }
interface SnowDepthDto { baseCm: number | null; topCm: number | null; }
`;
mkdirSync("tmp/t4-tscheck", { recursive: true });
writeFileSync("tmp/t4-tscheck/contract.ts", prelude + blocks.join("\n"));
console.log("written tmp/t4-tscheck/contract.ts");

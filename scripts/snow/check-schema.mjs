// Sanity-check the proposed SQL schema block from docs/snow/02-feature-matrix.md
// using Node's built-in SQLite (node:sqlite). Creates an in-memory DB, runs the
// whole block, then asserts the invariants stated in §3.3. Read-only w.r.t. docs.
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const md = readFileSync("docs/snow/02-feature-matrix.md", "utf8");
const sql = [...md.matchAll(/```sql\r?\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
if (!sql.trim()) {
  console.error("no sql block found");
  process.exit(2);
}

const db = new DatabaseSync(":memory:");
db.exec(sql);
console.log("schema applied: ok");

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all()
  .map((r) => r.name);
console.log("tables:", tables.join(", "));

let failures = 0;
const check = (label, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures++;
};

// Invariant 1: editorial tables must not contain OSM geometry/tags columns.
const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
const osmLeak = cols("station").filter((c) => /^(tags_json|osm_type|osm_id|snapshot_id|extracted_at)$/.test(c));
check("station has no OSM-derived columns", osmLeak.length === 0);

// Invariant 2: osm_derived_* holds no editorial columns.
const editorialLeak = cols("osm_derived_station")
  .filter((c) => /^(slug|region|discipline|season_open|season_close|website|author|confidence)$/.test(c));
check("osm_derived_station has no editorial columns", editorialLeak.length === 0);

// Invariant 3: CHECK constraints reject negative sentinels and bad enums.
const now = "2026-11-16T00:00:00Z";
db.prepare(
  `INSERT INTO station (slug,name,country,region,discipline,lat,lng,created_at,updated_at)
   VALUES ('baqueira-beret','Baqueira Beret','ES','Pirineo Catalán','alpine',42.7,0.9,?,?)`
).run(now, now);
const insertReport = (fields) =>
  db.prepare(
    `INSERT INTO snow_report (station_id,observed_at,captured_at,source_url,author,confidence,created_at,updated_at,${Object.keys(fields).join(",")})
     VALUES (1,?,?,?,?,?,?,?,${Object.keys(fields).map(() => "?").join(",")})`
  ).run(now, now, "https://example.invalid/report", "operator", 0.9, now, now, ...Object.values(fields));

let threw = false;
try { insertReport({ base_cm: -1 }); } catch { threw = true; }
check("negative base_cm (-1) rejected by CHECK", threw);

threw = false;
try { insertReport({ lifts_open: -99 }); } catch { threw = true; }
check("negative lifts_open (-99) rejected by CHECK", threw);

threw = false;
try { insertReport({ mood: "nonsense" }); } catch { threw = true; }
check("invalid mood rejected by CHECK", threw);

threw = false;
try { insertReport({ avalanche_level: 6 }); } catch { threw = true; }
check("avalanche_level 6 rejected by CHECK", threw);

// NULL is the accepted representation of absence.
let okNull = true;
try { insertReport({ base_cm: null, lifts_open: null }); } catch { okNull = false; }
check("NULL represents absence (accepted)", okNull);

// discipline enum
threw = false;
try {
  db.prepare(
    `INSERT INTO station (slug,name,country,region,discipline,lat,lng,created_at,updated_at)
     VALUES ('x','X','ES','R','bogus',1,1,?,?)`
  ).run(now, now);
} catch { threw = true; }
check("invalid discipline rejected by CHECK", threw);

db.close();
console.log(failures === 0 ? "RESULT: all invariants hold" : `RESULT: ${failures} invariant(s) failed`);
process.exit(failures === 0 ? 0 : 1);

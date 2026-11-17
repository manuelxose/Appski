-- Destino documentado (R2) del almacén snow. NO se usa en runtime v1 (que es
-- JSON versionado); se valida con `node scripts/snow/check-schema.mjs`.
-- Fuente: docs/snow/02-feature-matrix.md §3.3. Regla ODbL (05b §5): los campos
-- derivados de OSM viven SOLO en osm_derived_*; el puente es opaco y sin FK.

-- Maestro EDITORIAL (nuestra curaduría; no proviene de OSM ni de infonieve)
CREATE TABLE station (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  country       TEXT NOT NULL CHECK (country IN ('ES','AD','FR','PT')),
  region        TEXT NOT NULL,
  discipline    TEXT NOT NULL CHECK (discipline IN ('alpine','nordic')),
  lat           REAL NOT NULL,
  lng           REAL NOT NULL,
  alt_base_m    INTEGER,
  alt_top_m     INTEGER,
  website       TEXT,
  season_open   TEXT,
  season_close  TEXT,
  season_confirmed INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Parte EDITORIAL (única fuente legal de estado y espesores: 05b §3)
CREATE TABLE snow_report (
  id            INTEGER PRIMARY KEY,
  station_id    INTEGER NOT NULL REFERENCES station(id),
  observed_at   TEXT NOT NULL,
  captured_at   TEXT NOT NULL,
  source_url    TEXT NOT NULL,
  author        TEXT NOT NULL,
  confidence    REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  lifts_open    INTEGER, lifts_total INTEGER,
  pistes_open   INTEGER, pistes_total INTEGER,
  km_open       REAL,    km_total    REAL,
  base_cm       INTEGER, mid_cm INTEGER, top_cm INTEGER,
  new_snow_24h_cm INTEGER,
  quality       TEXT,
  avalanche_level INTEGER CHECK (avalanche_level BETWEEN 1 AND 5),
  mood          TEXT NOT NULL DEFAULT 'published'
                CHECK (mood IN ('draft','pending','published','rejected')),
  expires_at    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  CHECK (lifts_open IS NULL OR lifts_open >= 0),
  CHECK (base_cm   IS NULL OR base_cm   >= 0)
);
CREATE INDEX snow_report_station_observed ON snow_report(station_id, observed_at DESC);

-- Previsión / aludes: AUTOMÁTICOS, guardados con su procedencia
CREATE TABLE forecast_cache (
  id          INTEGER PRIMARY KEY,
  station_id  INTEGER NOT NULL REFERENCES station(id),
  source      TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

-- Aislamiento ODbL (05b §5): aquí SOLO campos derivados de OSM
CREATE TABLE osm_derived_station (
  id INTEGER PRIMARY KEY, osm_type TEXT NOT NULL, osm_id TEXT NOT NULL,
  name TEXT, lat REAL, lng REAL, tags_json TEXT,
  snapshot_id TEXT NOT NULL, extracted_at TEXT NOT NULL
);
CREATE TABLE station_osm_link (
  station_id INTEGER NOT NULL REFERENCES station(id),
  osm_ref    TEXT NOT NULL,
  PRIMARY KEY (station_id, osm_ref)
);

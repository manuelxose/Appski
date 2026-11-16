# Seed editorial (datos propios, no derivados)

Estos ficheros son la **curaduría editorial** del equipo (R2). No provienen de
infonieve ni de OpenStreetMap: son los nombres/coordenadas/websites que un humano
mantiene para el maestro de estaciones.

- `stations.json` — maestro editorial (`Station`). 3 estaciones de ejemplo.
- `snow-reports.json` — partes editoriales. **Vacío** a propósito: pretemporada
  (C6), el estado poblado no está observado y el camino correcto es `no_data`
  (`outside-season`) hasta que el admin introduzca un parte real.
- `osm-derived.json` — **separación ODbL**: si algún día se extraen datos de OSM
  (geometría/nombres), van AQUÍ, nunca en `stations.json`. **Vacío en v1, y ese
  vacío es VACUO a propósito**: no hay extracción OSM en runtime y no se ha
  verificado ningún id real de nodo/vía OSM en este entorno (no usamos Overpass/
  Nominatim en runtime y no se fabrica un id plausible sin referencia). Por tanto
  las aserciones de *contenido* ODbL (C18/C19) miden solo la forma del esquema,
  no contenido, hasta que se importe un extracto OSM real con su atribución.

`SNOW_DATA_DIR` (por defecto `data/snow`) es el directorio de runtime; estos
`seed/` se copian la primera vez que el servidor arranca, por `bootstrapStore()`
(`file-io.ts`, invocado desde `createSnowRouter`): **por fichero**, solo si el
destino NO existe, y una sola vez (nunca sobrescribe datos de runtime). Los
valores por defecto están embebidos en el bundle porque `dist/` no incluye este
directorio; cuando el seed está disponible en disco se usa el fichero real.

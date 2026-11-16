/**
 * Diagnóstico del entorno confined de ENGINE-04 (etapa NO requerida del manifiesto).
 *
 * Registra la identidad del intérprete y del entorno que usa el runner, para
 * distinguir "el código falla" de "el runner no puede ejecutar la operación".
 * Un único log deja una traza identificable en el `outputTail` de la evidencia.
 */
const info = {
  kind: 'engine04-confined-identity',
  pid: process.pid,
  execPath: process.execPath,
  versions: { node: process.versions.node, electron: process.versions.electron ?? null },
  cwd: process.cwd(),
  TEMP: process.env.TEMP ?? null,
  TMP: process.env.TMP ?? null,
  NX_DAEMON: process.env.NX_DAEMON ?? null,
  SNOW_ADMIN_TOKEN: process.env.SNOW_ADMIN_TOKEN === undefined ? 'undefined' : 'present',
};

// 1. ¿Escribe en un temporal fuera del workspace?
try {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'engine04-diag-'));
  writeFileSync(join(dir, 'x'), 'x');
  rmSync(dir, { recursive: true, force: true });
  info.tempWrite = 'ok';
} catch (error) {
  info.tempWrite = `FAIL ${error?.code ?? error}`;
}

// 2. ¿Puede lanzar un proceso hijo? Se prueba una vez por configuración de stdio.
const { spawn } = await import('node:child_process');
const trySpawn = (stdio) =>
  new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (!done) {
        done = true;
        resolve(value);
      }
    };
    try {
      const child = spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio });
      child.on('error', (error) => finish(`FAIL ${error?.code ?? error}`));
      child.on('exit', (code) => finish(`ok exit=${code}`));
      setTimeout(() => finish('timeout'), 5000);
    } catch (error) {
      finish(`FAIL ${error?.code ?? error}`);
    }
  });

info.spawn = {
  inherit: await trySpawn('inherit'),
  pipe: await trySpawn(['ignore', 'pipe', 'pipe']),
  ignore: await trySpawn(['ignore', 'ignore', 'ignore']),
};

console.log(`IDENTITY ${JSON.stringify(info)}`);

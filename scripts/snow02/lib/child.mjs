#!/usr/bin/env node
/**
 * Lanzador de proceso hijo COMPATIBLE con el runner confined de ENGINE-04.
 *
 * Medido dentro del runner con `scripts/snow02/confined-identity.mjs`:
 *   spawn { stdio: 'inherit' }                    → ok
 *   spawn { stdio: ['ignore','ignore','ignore'] } → ok
 *   spawn { stdio: ['ignore','pipe','pipe'] }     → EPERM
 *
 * El sandbox deniega la creación de pipes, no la de procesos. Todo hijo que sólo
 * necesitemos lanzar debe heredar los descriptores o ignorarlos; nunca pedir pipes.
 * Además el runner sanitiza el entorno, así que las credenciales se inyectan de
 * forma explícita desde el llamador.
 */
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';

/**
 * Lanza un hijo sin pipes. Devuelve un asa con:
 *   - `exited` / `exitCode()`: si terminó y con qué código
 *   - `kill(signal)`: termina el proceso
 *   - `wait()`: promesa que resuelve en el cierre
 *
 * `logPath` (opcional) redirige stdout+stderr a ese fichero. Es la alternativa a los
 * pipes cuando hace falta conservar la salida dentro de un sandbox que los deniega.
 */
export function spawnNoPipe(command, args, { cwd, env, stdio = 'ignore', logPath } = {}) {
  let outFd = null;
  let stream = stdio === 'inherit' ? 'inherit' : ['ignore', 'ignore', 'ignore'];
  if (logPath) {
    outFd = openSync(logPath, 'w');
    stream = ['ignore', outFd, outFd];
  }
  const child = spawn(command, args, {
    cwd,
    env: env ?? process.env,
    stdio: stream,
    windowsHide: true,
  });
  let exit = null;
  const closed = new Promise((resolve) => {
    const closeFd = () => {
      if (outFd !== null) {
        try {
          closeSync(outFd);
        } catch {
          /* ya cerrado */
        }
        outFd = null;
      }
    };
    child.on('error', (error) => {
      closeFd();
      exit = { code: null, signal: null, error: String(error?.code ?? error) };
      resolve(exit);
    });
    child.on('exit', (code, signal) => {
      closeFd();
      exit = { code, signal, error: null };
      resolve(exit);
    });
  });
  return {
    get exited() {
      return exit !== null;
    },
    exitCode: () => (exit ? exit.code : null),
    exitInfo: () => exit,
    kill(signal = 'SIGKILL') {
      try {
        child.kill(signal);
      } catch {
        /* best effort */
      }
    },
    wait: () => closed,
    raw: child,
  };
}

/**
 * Espera a que `probe()` devuelva algo distinto de `null`. Lanza si vence el plazo
 * o si `onDead()` informa de que el proceso no llegará a estar listo.
 */
export async function waitUntilReady(probe, { timeoutMs = 60000, intervalMs = 250, onDead } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (onDead) {
      const dead = onDead();
      if (dead) throw dead;
    }
    try {
      const result = await probe();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`timeout esperando disponibilidad: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

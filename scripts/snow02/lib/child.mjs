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

/**
 * Lanza un hijo sin pipes. Devuelve un asa con:
 *   - `exited` / `exitCode()`: si terminó y con qué código
 *   - `kill(signal)`: termina el proceso
 *   - `wait()`: promesa que resuelve en el cierre
 */
export function spawnNoPipe(command, args, { cwd, env, stdio = 'ignore' } = {}) {
  const child = spawn(command, args, {
    cwd,
    env: env ?? process.env,
    stdio: stdio === 'inherit' ? 'inherit' : ['ignore', 'ignore', 'ignore'],
    windowsHide: true,
  });
  let exit = null;
  const closed = new Promise((resolve) => {
    child.on('error', (error) => {
      exit = { code: null, signal: null, error: String(error?.code ?? error) };
      resolve(exit);
    });
    child.on('exit', (code, signal) => {
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

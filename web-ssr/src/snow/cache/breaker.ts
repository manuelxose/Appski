import type { BreakerConfig, ProviderId } from '../contracts/provider-contracts';

export const BREAKER: BreakerConfig = {
  failureThreshold: 5,
  openMs: 5 * 60_000,
  halfOpenProbes: 1,
};

export type BreakerPhase = 'closed' | 'open' | 'half-open';

interface BreakerState {
  failures: number;
  openUntil: number;
  /** Probes concedidos mientras está abierto→half-open. */
  probes: number;
}

/**
 * Circuit breaker por proveedor con transición real a half-open.
 *
 * Estados:
 *   closed    → pasa todo. Al llegar a `failureThreshold` fallos abre.
 *   open      → `allow()` devuelve false hasta `openUntil`.
 *   half-open → vencido `openUntil`, se concede `halfOpenProbes` intento(s).
 *               Un éxito cierra el circuit (reset a 0 fallos); un fallo reabre.
 *
 * El reloj se inyecta para que los tests sean deterministas (nada de Date.now()
 * implícito). En producción, `SnowDataService` no pasa `now` y se usa `Date.now()`.
 */
export class Breaker {
  private readonly state = new Map<ProviderId, BreakerState>();

  constructor(private readonly config: BreakerConfig = BREAKER) {}

  /** ¿Se permite intentar el proveedor ahora? Consume un probe si está half-open. */
  allow(id: ProviderId, now: number = Date.now()): boolean {
    const s = this.state.get(id);
    if (!s) return true;
    if (s.openUntil === 0) return true;
    if (now < s.openUntil) return false;
    // Vencido el plazo: half-open. Se concede como máximo `halfOpenProbes` intento(s).
    if (s.probes < this.config.halfOpenProbes) {
      s.probes += 1;
      return true;
    }
    return false;
  }

  recordSuccess(id: ProviderId): void {
    const s = this.get(id);
    s.failures = 0;
    s.openUntil = 0;
    s.probes = 0;
  }

  recordFailure(id: ProviderId, now: number = Date.now()): void {
    const s = this.get(id);
    if (s.openUntil !== 0 && now >= s.openUntil) {
      // Falló el probe de half-open: reabre de inmediato.
      this.open(id, this.config.openMs, now);
      return;
    }
    s.failures += 1;
    if (s.failures >= this.config.failureThreshold) {
      this.open(id, this.config.openMs, now);
    }
  }

  open(id: ProviderId, ms: number, now: number = Date.now()): void {
    const s = this.get(id);
    s.openUntil = now + ms;
    s.probes = 0;
  }

  phase(id: ProviderId, now: number = Date.now()): BreakerPhase {
    const s = this.state.get(id);
    if (!s || s.openUntil === 0) return 'closed';
    if (now < s.openUntil) return 'open';
    return s.probes < this.config.halfOpenProbes ? 'half-open' : 'open';
  }

  isOpen(id: ProviderId, now: number = Date.now()): boolean {
    const s = this.state.get(id);
    return s !== undefined && s.openUntil !== 0 && now < s.openUntil;
  }

  snapshot(now: number = Date.now()): ReadonlyArray<{
    id: ProviderId;
    open: boolean;
    failures: number;
    phase: BreakerPhase;
    openUntilMs: number | null;
  }> {
    return [...this.state.entries()].map(([id, s]) => ({
      id,
      open: s.openUntil !== 0 && now < s.openUntil,
      failures: s.failures,
      phase: this.phase(id, now),
      // Ventana de apertura observable (para /v1/config): null si nunca se abrió.
      openUntilMs: s.openUntil === 0 ? null : s.openUntil,
    }));
  }

  private get(id: ProviderId): BreakerState {
    let s = this.state.get(id);
    if (!s) {
      s = { failures: 0, openUntil: 0, probes: 0 };
      this.state.set(id, s);
    }
    return s;
  }
}

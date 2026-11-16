import type { BreakerConfig, ProviderId } from '../contracts/provider-contracts';

export const BREAKER: BreakerConfig = {
  failureThreshold: 5,
  openMs: 5 * 60_000,
  halfOpenProbes: 1,
};

interface BreakerState {
  failures: number;
  openUntil: number;
}

/**
 * Circuit breaker por proveedor. Estado en memoria (persistible en el futuro).
 * `verified:false` de las cuotas se expone vía snapshot para admin/telemetría.
 */
export class Breaker {
  private readonly state = new Map<ProviderId, BreakerState>();

  recordFailure(id: ProviderId): void {
    const s = this.get(id);
    s.failures += 1;
    if (s.failures >= BREAKER.failureThreshold) {
      this.open(id, BREAKER.openMs);
    }
  }

  open(id: ProviderId, ms: number): void {
    const s = this.get(id);
    s.openUntil = Date.now() + ms;
  }

  isOpen(id: ProviderId): boolean {
    const s = this.state.get(id);
    return s !== undefined && s.openUntil > Date.now();
  }

  snapshot(): ReadonlyArray<{ id: ProviderId; open: boolean; failures: number }> {
    return [...this.state.entries()].map(([id, s]) => ({
      id,
      open: s.openUntil > Date.now(),
      failures: s.failures,
    }));
  }

  private get(id: ProviderId): BreakerState {
    let s = this.state.get(id);
    if (!s) {
      s = { failures: 0, openUntil: 0 };
      this.state.set(id, s);
    }
    return s;
  }
}

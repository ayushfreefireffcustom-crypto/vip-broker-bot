// In-memory per-user sliding-window rate limiter. Single-instance is fine for a
// verification funnel; if the bot is ever horizontally scaled this moves to Redis.
// Pure and deterministic (now is injectable) so it unit-tests without timers.
export type RateVerdict = 'ok' | 'limit' | 'over';

export class RateLimiter {
  private hits = new Map<number, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {}

  /** 'ok' = allowed; 'limit' = first update past the cap (warn once); 'over' = drop. */
  check(id: number, now: number = Date.now()): RateVerdict {
    const recent = (this.hits.get(id) ?? []).filter((t) => now - t < this.windowMs);
    recent.push(now);
    this.hits.set(id, recent);
    if (recent.length <= this.max) return 'ok';
    return recent.length === this.max + 1 ? 'limit' : 'over';
  }
}

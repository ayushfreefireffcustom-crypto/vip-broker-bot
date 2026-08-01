// Per-user rate limit, mounted before session/DB work so spam is dropped cheaply.
// Warns once when the cap is first exceeded, then silently drops further updates.
import type { NextFunction } from 'grammy';
import { env } from '../../config/env.js';
import { RateLimiter } from '../../lib/rate-limiter.js';
import { copy } from '../copy.js';
import type { BotContext } from '../context.js';

const limiter = new RateLimiter(env.RATE_WINDOW_MS, env.RATE_MAX);

export async function rateLimit(ctx: BotContext, next: NextFunction): Promise<void> {
  const id = ctx.from?.id;
  if (id == null) return next();

  const verdict = limiter.check(id);
  if (verdict === 'ok') return next();
  if (verdict === 'limit') {
    try {
      await ctx.reply(copy.slowDown());
    } catch {
      /* ignore */
    }
  }
  // 'limit' and 'over' both stop here — the update is dropped.
}

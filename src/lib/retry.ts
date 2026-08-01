// Small exponential-backoff retry for transient outbound failures (Telegram API
// hiccups). Used for the critical grant path so a blip doesn't lose a user their
// invite link.
export async function withRetry<T>(fn: () => Promise<T>, opts: { retries?: number; baseMs?: number } = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseMs = opts.baseMs ?? 200;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, baseMs * 2 ** attempt));
    }
  }
  throw lastErr;
}

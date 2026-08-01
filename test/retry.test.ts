import { describe, it, expect } from 'vitest';
import { withRetry } from '../src/lib/retry.js';

describe('withRetry', () => {
  it('returns once the function succeeds', async () => {
    let calls = 0;
    const r = await withRetry(
      () => {
        calls += 1;
        if (calls < 3) return Promise.reject(new Error('flaky'));
        return Promise.resolve('ok');
      },
      { retries: 3, baseMs: 0 },
    );
    expect(r).toBe('ok');
    expect(calls).toBe(3);
  });

  it('throws the last error after exhausting retries', async () => {
    let calls = 0;
    await expect(
      withRetry(
        () => {
          calls += 1;
          return Promise.reject(new Error('always'));
        },
        { retries: 2, baseMs: 0 },
      ),
    ).rejects.toThrow('always');
    expect(calls).toBe(3); // initial + 2 retries
  });
});

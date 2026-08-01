// Custom bot context. `withSession` middleware attaches the loaded FSM session
// and the user's id (as bigint, matching the DB) before any feature handler runs.
import type { Context } from 'grammy';
import { State } from './flows/state.js';

export interface SessionData {
  state: string;
  broker: string | null;
  identifier: string | null;
  screenshotFileId: string | null;
}

export interface BotContext extends Context {
  /** Loaded FSM session for ctx.from — always present in feature handlers. */
  session: SessionData;
  /** ctx.from.id as a bigint (DB key type). */
  userId: bigint;
}

export function defaultSession(): SessionData {
  return { state: State.Idle, broker: null, identifier: null, screenshotFileId: null };
}

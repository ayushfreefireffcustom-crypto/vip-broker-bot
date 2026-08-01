// Admin authorization — only whitelisted Telegram user ids (ADMIN_IDS) may
// approve/reject or run admin commands.
import { env } from '../config/env.js';

export function isAdmin(userId: number | bigint): boolean {
  return env.adminIds.includes(Number(userId));
}

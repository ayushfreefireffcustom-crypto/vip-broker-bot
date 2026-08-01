// Download an uploaded file's text via the Telegram file API (getFile → fetch).
import { env } from '../config/env.js';
import type { BotContext } from '../bot/context.js';

export async function downloadFileText(ctx: BotContext, fileId: string): Promise<string> {
  const file = await ctx.api.getFile(fileId);
  if (!file.file_path) throw new Error('getFile returned no file_path');
  const res = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`);
  if (!res.ok) throw new Error(`file download failed: ${res.status}`);
  return res.text();
}

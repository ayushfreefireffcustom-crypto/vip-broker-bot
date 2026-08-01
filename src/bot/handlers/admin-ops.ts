// Admin operations: refresh the referred-clients list by uploading a <broker>.csv
// document to the bot. Admin-gated; non-admin documents fall through untouched.
import { Composer } from 'grammy';
import type { BotContext } from '../context.js';
import { isAdmin } from '../../admin/auth.js';
import { detectBroker, ingestCsvText } from '../../admin/ingest.js';
import { downloadFileText } from '../../lib/telegram-file.js';
import { brokerLabel } from '../flows/brokers.js';
import { pendingList, funnelStats } from '../../admin/stats.js';
import {
  adminCsvNameHint,
  adminCsvIngested,
  adminCsvDownloadFailed,
  formatPending,
  formatStats,
} from '../../admin/copy.js';

export const adminOpsFeature = new Composer<BotContext>();

adminOpsFeature.command('pending', async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;
  await ctx.reply(formatPending(await pendingList()), { parse_mode: 'HTML' });
});

adminOpsFeature.command('stats', async (ctx) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;
  await ctx.reply(formatStats(await funnelStats()), { parse_mode: 'HTML' });
});

adminOpsFeature.on('message:document', async (ctx, next) => {
  if (!ctx.from || !isAdmin(ctx.from.id)) return next();

  const doc = ctx.message.document;
  const broker = detectBroker(doc.file_name ?? '');
  if (!broker) {
    await ctx.reply(adminCsvNameHint(), { parse_mode: 'HTML' });
    return;
  }

  let text: string;
  try {
    text = await downloadFileText(ctx, doc.file_id);
  } catch {
    await ctx.reply(adminCsvDownloadFailed(), { parse_mode: 'HTML' });
    return;
  }

  const { count } = await ingestCsvText(broker, text);
  await ctx.reply(adminCsvIngested(brokerLabel(broker), count), { parse_mode: 'HTML' });
});

// Bot entry point. Long-polling in dev, webhook in prod (both behind a small http
// server that also answers /health for the platform's health check). Graceful
// shutdown drains the bot and disconnects Prisma.
import '../load-env.js'; // must be first — populates process.env before config loads
import { createServer } from 'node:http';
import { webhookCallback } from 'grammy';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../db/prisma.js';
import { createBot } from './bot.js';
import { runReminders } from './reminders.js';
import { handleIngest } from '../ingest/webhook.js';

const WEBHOOK_PATH = '/webhook';
const INGEST_PREFIX = '/ingest/';

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1_000_000) req.destroy(); // cap at 1MB
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function main(): Promise<void> {
  const bot = createBot(env.BOT_TOKEN);
  const handleWebhook = env.BOT_MODE === 'webhook' ? webhookCallback(bot, 'http') : null;

  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, mode: env.BOT_MODE }));
      return;
    }
    if (handleWebhook && req.method === 'POST' && req.url === WEBHOOK_PATH) {
      void handleWebhook(req, res);
      return;
    }
    // Broker postback ingest: POST /ingest/<broker> (token in x-ingest-token or ?token=).
    if (req.method === 'POST' && req.url && req.url.startsWith(INGEST_PREFIX)) {
      void (async () => {
        const url = new URL(req.url as string, 'http://localhost');
        const broker = url.pathname.slice(INGEST_PREFIX.length);
        const token = (req.headers['x-ingest-token'] as string | undefined) ?? url.searchParams.get('token') ?? undefined;
        let json: unknown = null;
        try {
          json = JSON.parse((await readBody(req)) || 'null');
        } catch {
          json = null;
        }
        const { status, body } = await handleIngest(broker, token, json);
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      })().catch((err) => {
        logger.error(err, 'ingest error');
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
  server.listen(env.PORT, () => logger.info({ port: env.PORT, mode: env.BOT_MODE }, 'http server up'));

  if (env.BOT_MODE === 'webhook') {
    await bot.api.setWebhook(`${env.WEBHOOK_DOMAIN}${WEBHOOK_PATH}`);
    logger.info({ domain: env.WEBHOOK_DOMAIN }, 'webhook registered');
  } else {
    await bot.api.deleteWebhook();
    void bot.start({ onStart: (me) => logger.info({ username: me.username }, 'bot polling') });
  }

  // Stalled-funnel reminder tick.
  const reminderTimer = setInterval(() => {
    void runReminders(bot.api).catch((err) => logger.error(err, 'reminder tick error'));
  }, env.REMINDER_INTERVAL_MINUTES * 60_000);

  const shutdown = async (sig: string): Promise<void> => {
    logger.info({ sig }, 'shutting down');
    clearInterval(reminderTimer);
    server.close();
    if (env.BOT_MODE === 'poll') await bot.stop();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error(err, 'fatal startup error');
  process.exit(1);
});

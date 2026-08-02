// Sync worker entry point. Runs once on start, then on an interval. Meant to run
// as its own process (on the VPS), separate from the bot.
import '../load-env.js'; // must be first — populates process.env before config loads
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../db/prisma.js';
import { runSync } from './worker.js';
import { defaultSources } from './registry.js';

async function main(): Promise<void> {
  const sources = defaultSources();

  const tick = async (): Promise<void> => {
    try {
      const outcome = await runSync(sources);
      logger.info({ outcome }, 'sync tick complete');
    } catch (err) {
      logger.error(err, 'sync tick error');
    }
  };

  await tick();
  const timer = setInterval(() => void tick(), env.SYNC_INTERVAL_MINUTES * 60_000);
  logger.info({ everyMinutes: env.SYNC_INTERVAL_MINUTES }, 'sync worker scheduled');

  const shutdown = async (sig: string): Promise<void> => {
    logger.info({ sig }, 'sync worker shutting down');
    clearInterval(timer);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error(err, 'sync fatal startup error');
  process.exit(1);
});

// Assembles the bot: custom context + session middleware, then feature composers
// (added phase by phase). Kept separate from main.ts so tests can build a bot,
// feed it fake updates, and inspect outgoing calls without any network.
import { Bot, type BotConfig } from 'grammy';
import type { BotContext } from './context.js';
import { logger } from '../lib/logger.js';
import { withSession } from './middleware/session.js';
import { rateLimit } from './middleware/rate-limit.js';
import { idFeature } from './handlers/id.js';
import { startFeature } from './handlers/start.js';
import { commandsFeature } from './handlers/commands.js';
import { onboardingFeature } from './handlers/onboarding.js';
import { brokerFeature } from './handlers/broker.js';
import { contactScreenshotFeature } from './handlers/contact-screenshot.js';
import { adminFeature } from './handlers/admin.js';
import { adminOpsFeature } from './handlers/admin-ops.js';

export function createBot(token: string, config?: BotConfig<BotContext>): Bot<BotContext> {
  const bot = new Bot<BotContext>(token, config);

  // Error boundary around the whole middleware tree: one failing update is logged,
  // never crashing the process (covers both the polling loop and handleUpdate).
  const guarded = bot.errorBoundary((err) => {
    logger.error({ err: err.error, update: err.ctx.update.update_id }, 'unhandled bot error');
  });

  guarded.use(rateLimit); // cheap spam guard before any DB work
  guarded.use(idFeature); // /id setup helper — before session so it needs no DB
  guarded.use(withSession);
  guarded.use(adminFeature); // admin-group Approve/Reject callbacks
  guarded.use(adminOpsFeature); // admin CSV upload + ops commands
  guarded.use(startFeature);
  guarded.use(commandsFeature); // /cancel — must interrupt from any state
  guarded.use(onboardingFeature);
  guarded.use(brokerFeature);
  guarded.use(contactScreenshotFeature);

  return bot;
}

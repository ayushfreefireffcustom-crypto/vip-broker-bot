// Assembles the bot: custom context + session middleware, then feature composers
// (added phase by phase). Kept separate from main.ts so tests can build a bot,
// feed it fake updates, and inspect outgoing calls without any network.
import { Bot, type BotConfig } from 'grammy';
import type { BotContext } from './context.js';
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

  bot.use(rateLimit); // cheap spam guard before any DB work
  bot.use(idFeature); // /id setup helper — before session so it needs no DB
  bot.use(withSession);
  bot.use(adminFeature); // admin-group Approve/Reject callbacks
  bot.use(adminOpsFeature); // admin CSV upload + ops commands
  bot.use(startFeature);
  bot.use(commandsFeature); // /cancel — must interrupt from any state
  bot.use(onboardingFeature);
  bot.use(brokerFeature);
  bot.use(contactScreenshotFeature);

  return bot;
}

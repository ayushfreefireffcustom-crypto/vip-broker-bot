// Assembles the bot: custom context + session middleware, then feature composers
// (added phase by phase). Kept separate from main.ts so tests can build a bot,
// feed it fake updates, and inspect outgoing calls without any network.
import { Bot, type BotConfig } from 'grammy';
import type { BotContext } from './context.js';
import { withSession } from './middleware/session.js';
import { startFeature } from './handlers/start.js';
import { commandsFeature } from './handlers/commands.js';
import { onboardingFeature } from './handlers/onboarding.js';
import { brokerFeature } from './handlers/broker.js';

export function createBot(token: string, config?: BotConfig<BotContext>): Bot<BotContext> {
  const bot = new Bot<BotContext>(token, config);

  bot.use(withSession);
  bot.use(startFeature);
  bot.use(commandsFeature); // /cancel — must interrupt from any state
  bot.use(onboardingFeature);
  bot.use(brokerFeature);

  // More feature composers mount here as phases land:
  //   bot.use(contactScreenshotFeature);
  //   bot.use(adminFeature);

  return bot;
}

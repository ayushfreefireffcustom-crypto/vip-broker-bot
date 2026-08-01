// All user-facing copy in one place (HTML parse mode — no punctuation escaping).
// This is OUR OWN brand's wording; it replicates the funnel's *function*, not any
// other brand's identity. BRAND_NAME is configurable.
import { env } from '../config/env.js';

const brand = env.BRAND_NAME;

export const copy = {
  intro: () =>
    `🔒 <b>${brand} — VIP Access</b>\n\n` +
    `Verify your trading account under our partner link and unlock access to our private VIP channel.\n\n` +
    `Tap below to begin. ⬇️`,

  startButton: '🎉 Start Verification',

  welcomeBack: () => `👋 Welcome back to <b>${brand}</b>.`,

  askName: () => `Great — let's get you set up.\n\nWhat's your <b>full name</b>?`,

  chooseBroker: () => `Welcome! Please choose your <b>broker</b> to proceed.`,
};

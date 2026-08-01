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

  invalidName: () => `Please enter a valid name (letters, 2–80 characters).`,

  askPhone: (name: string) =>
    `Thanks, <b>${name}</b>! 📱\n\n` +
    `Now enter your <b>phone number</b> with country code — e.g. <code>+1 555 123 4567</code>.`,

  invalidPhone: () => `Please enter a valid phone number with country code, e.g. <code>+1 555 123 4567</code>.`,

  onboardingDone: () =>
    `✅ You're all set!\n\n` +
    `<i>By continuing you agree to our terms. We use your details only to verify your broker account.</i>`,

  chooseBroker: () => `Welcome! Please choose your <b>broker</b> to proceed.`,
};

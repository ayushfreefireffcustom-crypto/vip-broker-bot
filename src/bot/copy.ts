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

  askUid: (label: string) =>
    `Please send your <b>${label} UID</b> (account number).\n\nType /cancel to abort.`,

  askEmail: (label: string) =>
    `Please send your <b>${label} account email</b>.\n\nType /cancel to abort.`,

  invalidUid: (label: string) => `That doesn't look like a valid ${label} UID. Please send digits/letters only (4–20 chars).`,

  invalidEmail: () => `That doesn't look like a valid email. Please try again.`,

  checking: () => `⏳ <b>Checking your account…</b>\n\nThis can take a few seconds.`,

  shareContactButton: '📱 Share Contact',

  verifiedShareContact: () =>
    `✅ <b>Verified!</b>\n\nTap the button below to share your contact and continue.`,

  manualReview: () =>
    `🔎 <b>Almost there.</b>\n\nWe'll verify your account manually. Tap below to share your contact and continue.`,

  notUnderLink: (label: string, ref: string) =>
    `❌ We couldn't find your <b>${label}</b> account under our partner link.\n\n` +
    (ref
      ? `Please register or transfer using our link, then send your UID again:\n${ref}`
      : `Please make sure your account is registered under our partner link, then send your UID again.`),

  notEligible: (reasons: string[]) =>
    `⚠️ Your account doesn't meet the requirements yet:\n• ${reasons.join('\n• ')}\n\n` +
    `Minimum: deposit $${env.MIN_DEPOSIT_USD}, volume ${env.MIN_VOLUME_LOTS} lots.\n` +
    `Top up / trade, then send your UID again to re-check.`,

  contactThanks: (label: string) =>
    `✅ Thanks!\n\nNow upload a <b>screenshot from ${label}</b> that clearly shows your <b>account balance</b>.`,

  needPhoto: () => `Please upload a <b>photo</b> screenshot (send it as a photo, not a file).`,

  receivedPending: () =>
    `✅ <b>Received!</b>\n\nOur team will review your submission and get back to you shortly. You'll be notified here.`,

  approvedDm: (link: string) =>
    `🎉 <b>You're approved!</b>\n\n` +
    `Welcome to the VIP channel. Tap to join — this link is single-use and expires in 24h:\n${link}`,

  rejectedDm: () =>
    `❌ <b>Verification not approved.</b>\n\n` +
    `We couldn't approve your submission. If you believe this is a mistake, re-check your details and try again with /start.`,

  slowDown: () => `⏳ You're going a bit fast — please wait a moment and try again.`,

  reminder: () =>
    `👋 Still there? You have a verification in progress.\n\nSend the requested info to continue, or /start to begin again.`,

  cancelled: () => `Process cancelled.`,
};

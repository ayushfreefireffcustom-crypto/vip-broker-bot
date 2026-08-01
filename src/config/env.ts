// Zod-validated environment config. `load()` is pure (takes an env source) so it
// can be unit-tested; `env` is the validated singleton the app imports. Fields
// required for the bot to run are `.min(1)`; numbers are coerced with sane
// defaults. Pure logic (eligibility, FSM) takes thresholds as params rather than
// reaching for this global, so most unit tests never touch it.
import { z } from 'zod';

const schema = z.object({
  // Telegram
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  VIP_CHANNEL_ID: z.string().min(1, 'VIP_CHANNEL_ID is required'),
  ADMIN_GROUP_ID: z.string().min(1, 'ADMIN_GROUP_ID is required'),
  ADMIN_IDS: z.string().min(1, 'ADMIN_IDS is required'), // comma-separated user ids

  // Runtime mode
  BOT_MODE: z.enum(['poll', 'webhook']).default('poll'),
  WEBHOOK_DOMAIN: z.string().default(''),
  PORT: z.coerce.number().int().positive().default(8080),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Eligibility
  MIN_DEPOSIT_USD: z.coerce.number().nonnegative().default(100),
  MIN_VOLUME_LOTS: z.coerce.number().nonnegative().default(0.1),
  LIST_STALE_MINUTES: z.coerce.number().int().positive().default(180),

  // Sync worker — directory of per-broker CSV exports (<broker>.csv) and cadence.
  SYNC_CSV_DIR: z.string().default('./data'),
  SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive().default(30),

  // Optional per-broker helper images (file_id or https URL) shown when a user
  // picks a broker — "where to find your UID/email". Empty = send a text prompt.
  HELP_IMAGE_VANTAGE: z.string().default(''),
  HELP_IMAGE_EXNESS: z.string().default(''),
  HELP_IMAGE_XM: z.string().default(''),

  // Our partner/referral links, sent when a user isn't found under our link.
  REF_LINK_VANTAGE: z.string().default(''),
  REF_LINK_EXNESS: z.string().default(''),
  REF_LINK_XM: z.string().default(''),

  // Brand + logging
  BRAND_NAME: z.string().min(1).default('VIP Access'),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.string().default('development'),
});

export type Env = z.infer<typeof schema> & {
  /** Parsed numeric admin user ids (from ADMIN_IDS). */
  adminIds: number[];
};

/** Validate an env source into a typed config. Throws a readable error on failure. */
export function load(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.parse(source);

  const adminIds = parsed.ADMIN_IDS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = Number(s);
      if (!Number.isInteger(n)) throw new Error(`ADMIN_IDS contains a non-numeric id: "${s}"`);
      return n;
    });
  if (adminIds.length === 0) throw new Error('ADMIN_IDS must list at least one numeric user id');

  if (parsed.BOT_MODE === 'webhook' && !parsed.WEBHOOK_DOMAIN) {
    throw new Error('WEBHOOK_DOMAIN is required when BOT_MODE=webhook');
  }

  return { ...parsed, adminIds };
}

export const env = load();

// Runs before any test module imports application code, so `src/config/env.ts`
// validates against a complete (dummy) environment instead of throwing.
process.env.NODE_ENV ||= 'test';
process.env.LOG_LEVEL ||= 'silent';
process.env.BOT_TOKEN ||= '123456:TEST_TOKEN';
process.env.DATABASE_URL ||= 'postgresql://u:p@localhost:5432/db?schema=public';
process.env.VIP_CHANNEL_ID ||= '-1001000000001';
process.env.ADMIN_GROUP_ID ||= '-1001000000002';
process.env.ADMIN_IDS ||= '111';
process.env.MIN_DEPOSIT_USD ||= '100';
process.env.MIN_VOLUME_LOTS ||= '0.1';
process.env.BRAND_NAME ||= 'VIP Access';
process.env.INGEST_TOKEN ||= 'test-ingest-token';

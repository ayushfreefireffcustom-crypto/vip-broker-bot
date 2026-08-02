// Load .env into process.env before anything reads config. Imported first by the
// entrypoints (before config/env.ts evaluates). In hosted envs (Railway) there is
// no .env file — variables are already set — so a missing file is ignored.
import process from 'node:process';

try {
  process.loadEnvFile();
} catch {
  /* no .env file — rely on the real environment */
}

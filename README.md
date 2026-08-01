# VIP Broker-Verification Bot

A Telegram bot that verifies a user opened a trading account **under our IB/partner
link**, funded and traded the minimum, then grants access to a private VIP channel.

Built as our own brand — it replicates the *functionality* of a broker-referral
verification funnel, not any specific brand's identity.

## The funnel

```
/start
  └─ first time: intro → name → phone → consent
  └─ "Choose your broker"  →  [Vantage] [Exness] [XM]
        └─ send UID (Vantage/XM) or email (Exness)
        └─ ⏳ checking against our referred-clients list (funded ≥ $100, ≥ 0.1 lot)
        └─ ✅ verified → share contact → upload balance screenshot
        └─ admin reviews in the admin group → approve → VIP invite link
/cancel → back to broker menu
```

## Architecture

- **grammY (TypeScript)**, explicit DB-backed finite state machine for the funnel
  (state in Postgres → survives restarts, every step unit-testable offline).
- **Verification** reads a local `referred_clients` table (never live-scrapes in the
  user's request). A separate **sync worker** keeps that table fresh from a pluggable
  per-broker source (manual CSV floor now; authenticated report endpoint / headless
  scrape / official API added as build-time spikes confirm feasibility).
- **Admin** approval happens in a Telegram admin group with inline buttons.
- **Grant** = single-use, expiring channel invite link.

## Processes

| Command        | What it runs                                             |
|----------------|----------------------------------------------------------|
| `pnpm bot`     | the Telegram bot (poll in dev, webhook in prod)          |
| `pnpm sync`    | the referred-clients sync worker (scheduled)             |

## Setup

1. `pnpm install`
2. Copy `.env.example` → `.env` and fill it in (see that file for every key).
3. `pnpm db:migrate` to create the schema.
4. `pnpm bot:dev` for local long-polling development.

## Admin

Admins (Telegram ids in `ADMIN_IDS`) operate from the admin group:

- Each pending case posts a card (screenshot + details) with **✅ Approve / ❌ Reject**.
- **Upload `<broker>.csv`** to the bot to refresh that broker's referred-clients list.
- **`/pending`** — list open cases. **`/stats`** — funnel counts + list freshness.

## Testing

`pnpm test` — every handler is tested offline by feeding fabricated updates through
a mock that intercepts outgoing Telegram API calls and an in-memory Prisma fake, so
no live token or database is needed. `test/e2e.test.ts` walks the whole funnel.

## Deploy

Runs as **two processes** (e.g. two Railway services sharing one Postgres):

- `pnpm bot` — the bot (set `BOT_MODE=webhook` + `WEBHOOK_DOMAIN` in prod).
- `pnpm sync` — the referred-clients sync worker (on the VPS with portal access).

Apply migrations with `pnpm db:deploy`. Migrations are **additive only**.

## Constraints

- Additive migrations only.
- Do not push until told (deploys are triggered on push).
- Our own brand — this bot replicates a verification funnel's function, not any
  specific brand's identity.

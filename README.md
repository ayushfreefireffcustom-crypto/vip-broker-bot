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

## Testing

`pnpm test` — handlers are tested offline by feeding fake updates through a mock
that intercepts outgoing Telegram API calls, so no live bot token is needed.

## Constraints

- Additive migrations only.
- Do not push until told (deploys are triggered on push).

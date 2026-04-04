# Telegram Implementation Plan — Phase 1

Date: 2026-03-28
Author: Sol

## Goal
Make Telegram a real product surface for The Realm of Patterns.

## Implemented in this phase

### 1. Database migration
Created:
- `src/db/migration-telegram.sql`

Adds:
- `telegram_users`
- `telegram_checkins`
- `telegram_referrals`
- `telegram_payments`
- `telegram_events`

### 2. Env typing
Updated:
- `src/types/index.ts`

Added optional envs:
- `TELEGRAM_CHANNEL_ID`
- `TELEGRAM_BOT_USERNAME`

### 3. Telegram webhook endpoint
Created:
- `functions/api/telegram/webhook.ts`

Current behavior:
- receives Telegram updates
- upserts Telegram users
- logs Telegram events
- handles `/start`
- handles `/checkin`
- collects natal intake:
  - birth date
  - birth time or unknown fallback
  - birth place
- calls existing `/api/natal-chart` endpoint to generate first mirror preview
- stores Telegram check-ins
- supports referral payloads through `/start ref_<code>`

## Phase 1 status
This is a functional skeleton, not the full monetized Telegram business yet.

### Working skeleton capabilities
- Telegram users can enter through `/start`
- Telegram users can submit birth data
- Telegram users can receive a first natal mirror preview
- Telegram users can do a basic daily check-in
- Referral codes are tracked structurally
- Telegram events are logged for debugging/analytics

### Still needed next
1. Apply migration to D1
2. Register webhook with Telegram bot
3. Add geocoding for birth place -> lat/lon/tz
4. Improve natal preview formatting with dominant pattern + 16D summary
5. Add free/pay gating
6. Add payment flow (Telegram native and/or Stripe deep-link fallback)
7. Add channel publishing workflow
8. Add compare/share/reward logic

## Recommended next implementation step
Operationalize this phase by:
1. applying `migration-telegram.sql`
2. setting bot webhook to `/api/telegram/webhook`
3. testing `/start` and `/checkin` end to end

After that, build Phase 2:
- monetization
- referral rewards
- richer personalized outputs

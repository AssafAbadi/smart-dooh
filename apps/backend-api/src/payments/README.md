# Payments & Billing (Prompt 8)

## Overview

Handles **advertiser pre-payments** (Stripe/Tranzila) and **driver earnings** (impressions × 0.05 ILS) with payout summaries for bank transfers.

## Advertiser payments

### Stripe integration
- `POST /payments/create-intent` with body: `{ businessId, amountCents, provider: 'stripe', campaignId? }`
- Returns `{ paymentId, clientSecret }` for client-side Stripe.js confirmation
- After payment succeeds, call `POST /payments/complete/:paymentId` to mark completed and add budget to campaign
- **Env**: `STRIPE_SECRET_KEY` (obtain from Stripe dashboard; free tier available)

### Tranzila integration
- Tranzila is an Israeli payment gateway (redirect-based)
- `POST /payments/create-intent` with `provider: 'tranzila'` returns `{ paymentId, redirectUrl }`
- Redirect user to Tranzila; after success, call `POST /payments/complete/:paymentId`
- **Env**: `TRANZILA_TERMINAL` (your Tranzila terminal ID)

## Driver earnings

- **Formula**: `COUNT(impressions WHERE driverId) × 0.05 ILS`
- `GET /payments/driver-earnings/:driverId?periodStart=...&periodEnd=...` calculates earnings for a period
- **Monthly generation**: `POST /payments/admin/generate-earnings` (admin-only) with body `{ periodStart, periodEnd }` creates `DriverEarnings` records for all drivers (idempotent by `driverId + periodStart`). Run monthly via cron or manual.

## Payout service

- **Create payout**: `POST /payments/admin/create-payout` with `{ driverId, amountILS, bankDetails? }` (admin-only) creates a `Payout` record.
- **Payout summary**: `GET /payments/admin/payout-summary?status=pending` returns all pending payouts for bank transfer processing (CSV/JSON for accountant).
- **bankDetails** (optional Json): `{ accountNumber, bankCode, branchCode }` for Israeli bank transfers.

## Database models

- **Payment**: advertiser payments via Stripe/Tranzila (status: PENDING → COMPLETED → adds budget to campaign)
- **DriverEarnings**: monthly earnings per driver (impressionCount, earningsILS, paidOut)
- **Payout**: payout requests (status: pending → processing → completed)

## Security

- Admin routes use `AdminApiKeyGuard`: require `x-admin-api-key` header if `ADMIN_API_KEY` is set.
- Stripe and Tranzila keys are from env; never hardcoded.

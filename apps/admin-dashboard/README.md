# Admin Dashboard (Prompt 7)

Next.js 14 App Router app for Adrive admin: **analytics**, **moderation**, and **campaign CRUD with geofences**. Dark theme, red accents.

## Setup

```bash
cd apps/admin-dashboard
npm install
```

Set `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`) so the dashboard can call the backend. Optionally set `ADMIN_API_KEY` (backend) and `NEXT_PUBLIC_ADMIN_API_KEY` (dashboard) for admin auth.

## Run

```bash
npm run dev   # http://localhost:3001
```

## Features

1. **Analytics** (Dashboard): OTS = `COUNT(DISTINCT lat_hash) × 50 × 0.7`, Conversion rate = `(Redemptions / Impressions) × 100`, plus impression and redemption totals.
2. **Moderation**: List PENDING creatives, Approve/Reject with one click.
3. **Campaigns**: List, create, edit, delete campaigns. Edit geofence as circle (lat, lng, radius in m). Map view for drawing geofences can be added later (e.g. Mapbox/Leaflet).

## API

All data comes from the backend `/admin/*` routes. Optional guard: set `ADMIN_API_KEY` in the backend and send `x-admin-api-key` header (or set `NEXT_PUBLIC_ADMIN_API_KEY` for client requests).

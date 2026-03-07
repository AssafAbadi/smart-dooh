# Smart DOOH (Adrive)

A Digital Out-of-Home advertising platform with mobile driver app, backend API, and admin dashboard.

## Project Structure

```
smart-dooh/
├── apps/
│   ├── backend-api/          # NestJS API (Fastify)
│   ├── mobile-driver/        # Expo React Native app
│   ├── admin-dashboard/      # Next.js admin UI
│   └── mock-driver-simulator/# Testing tool
├── prisma/                   # Database schema & migrations
├── docs/                     # Implementation docs
└── .agents/skills/           # Installed Cursor skills
```

## Features

### Prompt 1: Context Engine
- Driver preference filtering (kosher, vegetarian, alcohol)
- Google Places API integration with Redis caching
- OpenWeatherMap API with rate limiting
- Heartbeat tracking for car screens

### Prompt 2: Ad Selection Engine
- Strategy chain: Emergency → Proximity → Paid Priority → Context Rules
- PostGIS geo-queries for nearby businesses
- Emergency alert override
- `AdInstruction` metadata generation

### Prompt 3: Ad Creative Service
- Trend-aware LLM creative generation (Gemini → GPT-4o fallback)
- Redis translation caching (Israeli slang support)
- `PENDING` status for moderation

### Prompt 4: Mobile Driver App
- React Native + Expo with TypeScript
- Two ad slots with real-time placeholder replacement
- MMKV offline queue for idempotent impressions
- Adaptive polling and heartbeats
- Dark theme with red accent

### Prompt 5: Mock Driver Simulator
- Simulates driver along GeoJSON route
- Tests Redis caching, impression idempotency, emergency override
- Located in `apps/mock-driver-simulator/`

### Prompt 6: Observability Stack
- Structured logging (Pino)
- Metrics (Prometheus/Grafana): ad selection latency, cache hit ratio, impressions
- Sentry integration (backend + mobile)

### Prompt 7: Admin Dashboard
- Next.js 14 (App Router) with Tailwind CSS
- Analytics: OTS formula, conversion rate
- Creative moderation (approve/reject `PENDING`)
- Campaign CRUD with geofence management

### Prompt 8: Payments & Billing
- Advertiser pre-payments (Stripe/Tranzila)
- Driver earnings calculation (0.05 ILS per impression)
- Monthly earnings generation and payout summaries

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ with PostGIS extension
- Redis 6+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Setup environment variables:
```bash
cp .env.example .env
# Fill in API keys: DATABASE_URL, REDIS_URL, GOOGLE_PLACES_API_KEY, OPENWEATHER_API_KEY, etc.
```

3. Setup database:
```bash
npx prisma migrate dev
npx prisma db seed
```

4. Generate Prisma client:
```bash
npx prisma generate
```

### Running the Apps

#### Backend API
```bash
npx nx serve backend-api
# Or: cd apps/backend-api && npm run dev
```

#### Mobile Driver App
```bash
cd apps/mobile-driver
npx expo start
```

#### Admin Dashboard
```bash
cd apps/admin-dashboard
npm run dev
```

#### Mock Driver Simulator
```bash
cd apps/mock-driver-simulator
npm start
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:cov
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

See [TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md) for comprehensive testing documentation.

## Environment Variables (API Keys in .env)

Required for backend:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `GOOGLE_PLACES_API_KEY`: Google Places API key
- `OPENWEATHER_API_KEY`: OpenWeatherMap API key
- `OPENAI_API_KEY`: OpenAI GPT-4o API key
- `GOOGLE_GEMINI_API_KEY`: Google Gemini API key
- `SERP_API_KEY`: SerpApi key for Google Trends
- `SENTRY_DSN`: Sentry DSN for backend error tracking
- `ADMIN_API_KEY`: Optional admin endpoint protection
- `STRIPE_SECRET_KEY`: Stripe API key for payments
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signature verification
- `TRANZILA_TERMINAL`: Tranzila terminal ID (Israeli payment gateway)

Required for mobile:
- `EXPO_PUBLIC_API_URL`: Backend API URL (e.g., `http://localhost:3000`)
- `EXPO_PUBLIC_SENTRY_DSN`: Sentry DSN for mobile error tracking

Required for admin dashboard:
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_ADMIN_API_KEY`: Admin API key for authentication

See `.env.example` for all available options.

## Observability (Prompt 6)

### Structured Logging
Backend uses Pino for JSON-structured logs. Configure log level via `LOG_LEVEL` env var (default: `info`).

### Metrics
Prometheus metrics available at `http://localhost:3000/metrics`:
- `ad_selection_latency_seconds`: Ad selection latency histogram
- `cache_hits_total`: Cache hit counter (by type: poi, weather)
- `cache_misses_total`: Cache miss counter
- `impressions_per_campaign_total`: Impressions per campaign

### Sentry
Error tracking for both backend and mobile app. Set `SENTRY_DSN` (backend) and `EXPO_PUBLIC_SENTRY_DSN` (mobile).

## Admin Dashboard (Prompt 7)

Access at `http://localhost:3000` (or configured `NEXT_PUBLIC_API_URL`).

Features:
- **Analytics Page**: OTS, conversion rate, total impressions/redemptions
- **Creatives Moderation**: Approve/reject `PENDING` creatives
- **Campaign Management**: Create, edit, delete campaigns with circle geofences

## Payments & Billing (Prompt 8)

### Advertiser Payments
- Supports Stripe (credit card) and Tranzila (Israeli payment gateway)
- Webhook endpoint: `POST /webhooks/stripe` (verifies signature if `STRIPE_WEBHOOK_SECRET` set)

### Driver Earnings
- Formula: `impressions * 0.05 ILS`
- Monthly earnings generated via admin endpoint: `POST /payments/admin/generate-earnings`
- Payouts created via: `POST /payments/admin/create-payout`

### Admin Endpoints
Protected by `x-admin-api-key` header if `ADMIN_API_KEY` is set.

## Architecture

- **Backend**: NestJS + Fastify + Prisma ORM
- **Database**: PostgreSQL with PostGIS extension
- **Cache**: Redis (ioredis)
- **Mobile**: React Native (Expo) + Zustand + MMKV
- **Admin**: Next.js 14 (App Router) + Tailwind CSS
- **Testing**: Jest + @nestjs/testing

## Installed Skills

The project uses the following Cursor agent skills:
- `react-native-architecture`
- `vercel-react-native-skills`
- `nestjs-best-practices`
- `nestjs-expert`
- `prisma-expert`
- `tailwind-design-system`

## Development

### Nx Commands
```bash
# Build backend
npx nx build backend-api

# Lint
npx nx lint backend-api

# Test
npx nx test backend-api
```

### Database Migrations
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

## Contributing

See [IMPLEMENTATION_STATUS.md](./docs/IMPLEMENTATION_STATUS.md) for detailed feature status and implementation notes.

## License

Proprietary

# Lokask

A full-stack service marketplace platform connecting customers with local service providers. Built as a TypeScript monorepo with a React Native mobile app, a Next.js admin web app, and an Express.js backend.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo), Expo Router, NativeWind, Zustand |
| Web | Next.js 14, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database & Auth | Supabase (Postgres + Auth) |
| Payments | Stripe (PaymentIntents + Connect) |
| Push Notifications | Firebase Cloud Messaging |
| Deployment | Railway (backend), Vercel (web), EAS (mobile) |

## Project Structure

```
lokask/
├── apps/
│   ├── mobile/          # Expo React Native app
│   └── web/             # Next.js admin dashboard
├── backend/             # Express REST API
│   └── src/
│       ├── config/      # Env & Supabase client
│       ├── middleware/  # Auth, rate limiting, error handling
│       ├── routes/      # API route handlers
│       ├── services/    # Business logic (notifications, conversations)
│       └── utils/       # Logger
├── packages/
│   └── types/           # Shared TypeScript types
└── docs/
    ├── schema.sql       # Supabase database schema
    └── DEPLOYMENT.md    # Deployment guide
```

## Prerequisites

- Node.js 20+
- npm 10+ (workspaces)
- [Supabase](https://supabase.com) project
- [Stripe](https://stripe.com) account
- [Expo CLI](https://docs.expo.dev/get-started/installation/) for mobile development
- (Optional) Firebase project for push notifications

## Setup

### 1. Clone and install

```bash
git clone https://github.com/coprir/lokask.git
cd lokask
npm install
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Fill in the values in `backend/.env`. See [Environment Variables](#environment-variables) below for descriptions.

### 3. Set up the database

Run the schema against your Supabase project:

```bash
# Via Supabase CLI
supabase db push

# Or paste docs/schema.sql into the Supabase SQL editor
```

## Development

```bash
# Run the backend API (port 4000)
npm run dev:backend

# Run the web admin app (port 3000)
npm run dev:web

# Run the mobile app (Expo dev server)
npm run dev:mobile
```

### Other scripts

```bash
npm run build:backend     # Compile backend TypeScript
npm run build:web         # Build Next.js web app
npm run lint              # Lint all workspaces
npm run typecheck         # Type-check all workspaces
npm run test              # Run all tests
npm run test:backend      # Run backend tests only
npm run db:migrate        # Run database migrations
npm run db:seed           # Seed the database
```

## API Overview

Base URL: `http://localhost:4000/api/v1`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/auth/sync-role` | Sync user role after signup |
| GET | `/users/:id` | Get user profile |
| GET/POST | `/services` | List or create services |
| GET | `/services/:id` | Get service detail |
| GET/POST | `/bookings` | List or create bookings |
| PATCH | `/bookings/:id/status` | Update booking status |
| GET/POST | `/messages` | List or send messages |
| POST | `/payments/create-intent` | Create Stripe payment intent |
| POST | `/reviews` | Submit a review |
| GET | `/notifications` | Get user notifications |
| POST | `/webhooks/stripe` | Stripe webhook handler |

All endpoints except `/health` require a `Authorization: Bearer <supabase-jwt>` header.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development` or `production` (default: `development`) |
| `PORT` | No | Server port (default: `4000`) |
| `LOG_LEVEL` | No | Winston log level (default: `info`) |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `FIREBASE_PROJECT_ID` | No | Firebase project ID (for push notifications) |
| `FIREBASE_CLIENT_EMAIL` | No | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | No | Firebase service account private key |
| `GOOGLE_MAPS_API_KEY` | No | Google Maps API key |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: `http://localhost:3000`) |

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment instructions.

- **Backend** → Railway (auto-deploys on push to `main`)
- **Web** → Vercel (auto-deploys on push to `main`)
- **Mobile** → EAS Build → App Store / Google Play

Required GitHub secrets for CI/CD: `RAILWAY_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## CI Status

[![Deploy LOKASK](https://github.com/coprir/lokask/actions/workflows/deploy.yml/badge.svg)](https://github.com/coprir/lokask/actions/workflows/deploy.yml)

## License

Private — all rights reserved.

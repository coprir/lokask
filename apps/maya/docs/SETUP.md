# MAYA AI — Setup Guide

## Prerequisites
- Node.js 20+
- PostgreSQL 16+ with pgvector extension
- Redis (or Upstash Redis)
- Accounts: OpenAI, ElevenLabs, Cloudinary, Stripe, Supabase

## Quick Start (Docker)

```bash
cd apps/maya
cp .env.example .env
# Fill in your .env values

docker-compose up -d
docker-compose exec maya-app npx prisma migrate dev
docker-compose exec maya-app npm run db:seed
```

## Manual Setup

### 1. Install Dependencies
```bash
cd apps/maya
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Database Setup (Supabase)
1. Create a Supabase project at https://supabase.com
2. Enable the pgvector extension in Supabase Dashboard → Database → Extensions
3. Copy your connection strings to `.env`

```bash
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Configure Services

#### OpenAI
- Get API key from https://platform.openai.com
- Models used: `gpt-4o` (chat), `gpt-4o-mini` (memory/captions), `dall-e-3` (images), `text-embedding-3-small` (memory vectors)

#### ElevenLabs
- Get API key from https://elevenlabs.io
- Create a voice or use an existing voice ID
- Set `ELEVENLABS_VOICE_ID_MAYA` to your chosen voice

#### Cloudinary
- Create account at https://cloudinary.com
- Copy Cloud Name, API Key, API Secret

#### Stripe
- Create account at https://stripe.com
- Create 3 subscription products (Basic $9.99, Premium $24.99, VIP $49.99)
- Copy price IDs to `.env`
- Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
- Events to listen: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

#### Upstash Redis
- Create Redis database at https://upstash.com
- Copy REST URL and token

### 5. Run Development Server
```bash
npm run dev
# App available at http://localhost:3001
```

## Vercel Deployment

1. Import the `apps/maya` directory to Vercel
2. Add all environment variables in Vercel Dashboard
3. Set build command: `npx prisma generate && next build`
4. Deploy

Vercel cron jobs are automatically configured via `vercel.json`:
- Morning messages: Daily at 9 AM UTC
- Content scheduling: Every hour

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (with pgvector) |
| `NEXTAUTH_SECRET` | Random 32+ char secret for NextAuth |
| `OPENAI_API_KEY` | OpenAI API key |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `ELEVENLABS_VOICE_ID_MAYA` | ElevenLabs voice ID for Maya |
| `CLOUDINARY_*` | Cloudinary credentials |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_BASIC/PREMIUM/VIP` | Stripe price IDs |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `CRON_SECRET` | Secret for authenticating cron requests |

## Safety & Ethics

MAYA AI is built with mandatory safety features:
- **AI Disclosure Banner**: Shown on every page
- **AI Disclosure Header**: `X-AI-Disclosure` HTTP header on all responses
- **Content Moderation**: OpenAI moderation API on all user messages
- **Pattern Blocking**: Blocks attempts to extract personal info, solicit money, etc.
- **Rate Limiting**: Redis-based rate limiting on chat and voice
- **NSFW Filter**: Configurable via `NSFW_FILTER_ENABLED=true`

These cannot be disabled in production.

## Architecture

```
apps/maya/
├── src/
│   ├── app/                  # Next.js 15 App Router
│   │   ├── api/              # API routes
│   │   │   ├── chat/         # AI chat endpoint
│   │   │   ├── voice/        # ElevenLabs voice
│   │   │   ├── images/       # DALL-E image generation
│   │   │   ├── feed/         # Social feed
│   │   │   ├── memory/       # Memory CRUD
│   │   │   ├── subscriptions/# Stripe billing
│   │   │   ├── analytics/    # Dashboard stats
│   │   │   ├── leaderboard/  # Fan ranking
│   │   │   └── cron/         # Scheduled jobs
│   │   ├── chat/             # Chat page
│   │   ├── feed/             # Feed page
│   │   ├── dashboard/        # Admin dashboard
│   │   ├── pricing/          # Subscription plans
│   │   └── leaderboard/      # Fan leaderboard
│   ├── components/           # React components
│   ├── lib/                  # Core libraries
│   │   ├── prisma.ts         # DB client
│   │   ├── redis.ts          # Cache layer
│   │   ├── openai.ts         # OpenAI client
│   │   ├── elevenlabs.ts     # Voice synthesis
│   │   ├── cloudinary.ts     # Media storage
│   │   ├── stripe.ts         # Payments
│   │   ├── memory.ts         # Memory engine
│   │   ├── persona.ts        # Persona system
│   │   ├── safety.ts         # Safety checks
│   │   └── image-generation.ts # AI images
│   └── types/                # TypeScript types
├── prisma/
│   ├── schema.prisma         # Full DB schema
│   └── seed.ts               # Seed data (Maya persona)
├── brain/
│   ├── brain.md              # Maya's AI brain config
│   └── memory.json           # Memory system spec
├── Dockerfile
├── docker-compose.yml
└── vercel.json
```

# LOKASK — Complete Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    LOKASK PLATFORM                       │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ React Native │  │  Next.js Web │  │ Express API   │  │
│  │ Expo App     │  │  Landing +   │  │ Railway.app   │  │
│  │ iOS/Android  │  │  Admin       │  │               │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │          │
│         └────────────────┴───────────────────┘          │
│                          │                              │
│            ┌─────────────▼──────────────┐               │
│            │      Supabase Platform     │               │
│            │  PostgreSQL + PostGIS      │               │
│            │  Realtime Messaging        │               │
│            │  Auth (Email/Google/Apple) │               │
│            │  Storage (Images)          │               │
│            │  Row-Level Security        │               │
│            └────────────────────────────┘               │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Stripe       │  │ Firebase FCM │  │ Google Maps  │  │
│  │ Connect      │  │ Push Notifs  │  │ Geo/Location │  │
│  │ Direct Pay   │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Supabase Setup

### Create Project
1. Go to https://supabase.com → Create new project
2. Choose region: `eu-central-1` (Frankfurt, closest to Cyprus)
3. Set a strong database password

### Run Database Schema
1. Open Supabase SQL Editor
2. Paste and run the full contents of `docs/schema.sql`
3. Verify tables are created in Table Editor

### Enable Auth Providers
Go to Authentication → Providers:
- ✅ Email (already enabled)
- ✅ Google: Add OAuth credentials from Google Cloud Console
- ✅ Phone: Add Twilio credentials for OTP

### Create Storage Buckets
Run in SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('service-images', 'service-images', true),
  ('chat-images', 'chat-images', false),
  ('portfolio', 'portfolio', true);

-- Storage RLS policies
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);
CREATE POLICY "service_images_public" ON storage.objects FOR SELECT USING (bucket_id = 'service-images');
CREATE POLICY "service_images_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'service-images' AND auth.role() = 'authenticated'
);
```

### Get Credentials
Settings → API:
- `SUPABASE_URL`: Project URL
- `SUPABASE_ANON_KEY`: anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key (secret!)

---

## Step 2: Stripe Setup

### Create Account
1. https://stripe.com → Create account
2. Complete business verification

### Enable Stripe Connect
Dashboard → Connect → Get started → Set to Express

### Get API Keys
Developers → API keys:
- `STRIPE_SECRET_KEY`: sk_live_... (use sk_test_ for dev)
- Publishable key for mobile app

### Set Up Webhooks
Developers → Webhooks → Add endpoint:
- URL: `https://your-api.railway.app/api/v1/webhooks/stripe`
- Events to listen for:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `transfer.created`
  - `account.updated`
- Copy `STRIPE_WEBHOOK_SECRET` (whsec_...)

---

## Step 3: Firebase Setup

### Create Project
1. https://console.firebase.google.com
2. Create project → Enable Cloud Messaging

### Get Service Account
Project Settings → Service Accounts → Generate new private key
Download JSON, extract:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Download google-services.json (Android)
Project Settings → Your apps → Android → Download google-services.json
Place in: `apps/mobile/google-services.json`

---

## Step 4: Google Maps API

1. https://console.cloud.google.com
2. Enable: Maps SDK for Android, Maps SDK for iOS, Geocoding API, Places API
3. Create API key with app restrictions
4. Set `GOOGLE_MAPS_API_KEY`

---

## Step 5: Backend Deployment (Railway)

### Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Create Railway Project
```bash
cd backend
railway init
railway add --database # Don't need this — using Supabase
```

### Set Environment Variables
```bash
railway variables set \
  NODE_ENV=production \
  SUPABASE_URL=https://xxx.supabase.co \
  SUPABASE_ANON_KEY=xxx \
  SUPABASE_SERVICE_ROLE_KEY=xxx \
  STRIPE_SECRET_KEY=sk_live_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  FIREBASE_PROJECT_ID=xxx \
  FIREBASE_CLIENT_EMAIL=xxx \
  "FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
  GOOGLE_MAPS_API_KEY=xxx \
  "ALLOWED_ORIGINS=https://lokask.com,https://www.lokask.com"
```

### Deploy
```bash
cd backend
railway up
```

Railway will auto-detect Node.js, build TypeScript, and deploy.
Your API URL: `https://lokask-backend.up.railway.app`

### Add Railway Procfile
```
web: node dist/index.js
```

---

## Step 6: Web Deployment (Vercel)

```bash
cd apps/web

# Set env vars
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_API_URL  # your Railway URL

# Deploy
vercel --prod
```

Add custom domain in Vercel dashboard.

---

## Step 7: Mobile App (Expo)

### Install EAS CLI
```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Create .env file
```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Fill in:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_API_URL=https://lokask-backend.up.railway.app/api/v1
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
EXPO_PUBLIC_GOOGLE_MAPS_KEY=xxx
```

### Update app.json
```json
{
  "expo": {
    "extra": {
      "eas": { "projectId": "YOUR_EAS_PROJECT_ID" }
    }
  }
}
```

### Build for Production
```bash
cd apps/mobile

# iOS (requires Apple Developer account)
eas build --platform ios --profile production

# Android
eas build --platform android --profile production

# Both
eas build --platform all --profile production
```

### Submit to Stores
```bash
eas submit --platform ios
eas submit --platform android
```

---

## Step 8: GitHub Actions CI/CD

### Add Repository Secrets
GitHub repo → Settings → Secrets:
- `RAILWAY_TOKEN`: from Railway dashboard
- `VERCEL_TOKEN`: from Vercel account settings
- `VERCEL_ORG_ID`: from `vercel whoami`
- `VERCEL_PROJECT_ID`: from project settings

Pushes to `main` will auto-deploy backend and web.

---

## Environment Variables Quick Reference

### Backend (.env)
| Variable | Where to get it |
|---|---|
| SUPABASE_URL | Supabase → Settings → API |
| SUPABASE_ANON_KEY | Supabase → Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | Supabase → Settings → API |
| STRIPE_SECRET_KEY | Stripe → Developers → API keys |
| STRIPE_WEBHOOK_SECRET | Stripe → Developers → Webhooks |
| FIREBASE_PROJECT_ID | Firebase → Project Settings |
| FIREBASE_CLIENT_EMAIL | Firebase → Service Account JSON |
| FIREBASE_PRIVATE_KEY | Firebase → Service Account JSON |
| GOOGLE_MAPS_API_KEY | Google Cloud Console |
| ALLOWED_ORIGINS | Your frontend domains |

### Mobile (.env)
| Variable | Value |
|---|---|
| EXPO_PUBLIC_SUPABASE_URL | Same as backend SUPABASE_URL |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Same as backend SUPABASE_ANON_KEY |
| EXPO_PUBLIC_API_URL | Your Railway backend URL |
| EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe publishable key (pk_*) |
| EXPO_PUBLIC_GOOGLE_MAPS_KEY | Google Maps API key |

---

## Production Checklist

### Security
- [ ] All secrets in environment variables (never in code)
- [ ] Supabase RLS enabled on all tables
- [ ] Stripe webhook signature verification enabled
- [ ] Rate limiting configured
- [ ] CORS restricted to your domains
- [ ] HTTPS everywhere

### Performance
- [ ] Supabase indexes verified (run EXPLAIN ANALYZE on slow queries)
- [ ] PostGIS geo queries tested with real data
- [ ] Image CDN via Supabase Storage public bucket
- [ ] Railway auto-scaling configured

### Monitoring
- [ ] Railway logs monitoring
- [ ] Supabase dashboard alerts
- [ ] Stripe webhook delivery monitoring
- [ ] Error tracking (add Sentry: `npm install @sentry/node`)

### Testing
- [ ] Test payment flow with Stripe test cards
  - Success: `4242 4242 4242 4242`
  - Decline: `4000 0000 0000 0002`
  - 3D Secure: `4000 0025 0000 3155`
- [ ] Test geo search with real coordinates (Nicosia: 35.1856, 33.3823)
- [ ] Test all 6 languages
- [ ] Test booking status flows end-to-end

---

## Tech Stack Summary

| Layer | Technology | Hosting |
|---|---|---|
| Mobile | React Native + Expo | App Store / Play Store |
| Web | Next.js 14 | Vercel |
| API | Node.js + Express + TypeScript | Railway |
| Database | PostgreSQL + PostGIS | Supabase |
| Auth | Supabase Auth | Supabase |
| Realtime | Supabase Realtime | Supabase |
| Storage | Supabase Storage | Supabase |
| Payments | Stripe + Stripe Connect | Stripe |
| Push | Firebase FCM via Expo | Firebase |
| Maps | Google Maps | Google |
| CI/CD | GitHub Actions | GitHub |

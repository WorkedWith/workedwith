# WorkedWith

A two-sided review and trust platform for the UK trades industry — connecting tradespersons and clients with verified, transparent ratings.

## Tech stack

- **Framework**: Next.js 14 (App Router, TypeScript, Tailwind CSS)
- **Auth & Database**: Supabase (email/password + magic link)
- **Payments**: Stripe (wired later)

## Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine for development)

## Local setup

### 1. Clone and install

```bash
npm install
```

### 2. Environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → `service_role` secret key — **never expose this client-side** |

### 3. Apply the database migration

If you are using the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or run the SQL manually in the Supabase SQL editor:

```
supabase/migrations/20260616000000_initial_schema.sql
```

### 4. Configure Supabase Auth

In the Supabase dashboard → Authentication → Providers:

- Enable **Email** provider
- Enable **Magic Link** (under Email provider settings)

In Authentication → URL Configuration:

- Set **Site URL** to `http://localhost:3000` (dev) and your production domain
- Add `http://localhost:3000/**` to **Redirect URLs**

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
├── app/
│   ├── (public)/           # Marketing, trade profile pages, search
│   ├── (trade)/            # Tradesperson dashboard & onboarding
│   ├── (client-individual)/# Individual client dashboard & onboarding
│   ├── (client-business)/  # Business client dashboard & onboarding
│   ├── (admin)/            # Admin panel (ID verification, moderation)
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── supabase/
│       ├── client.ts       # Browser client (use in Client Components)
│       ├── server.ts       # Server client (use in Server Components & Route Handlers)
│       ├── middleware.ts   # Session refresh helper (used by src/middleware.ts)
│       └── admin.ts        # Service-role client (server-only, bypasses RLS)
├── middleware.ts           # Refreshes Supabase session on every request
└── types/
    └── database.ts         # Full TypeScript types for all tables
supabase/
└── migrations/
    └── 20260616000000_initial_schema.sql
```

## Database schema

### `public.users`
Extends `auth.users`. Created automatically via trigger on sign-up.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | References `auth.users` |
| `email` | text | Unique |
| `user_type` | text | `tradesperson`, `client`, or `both` |
| `client_type` | text | `individual` or `business` |
| `full_name` | text | |
| `phone` | text | Unique |
| `phone_verified` | boolean | |
| `verification_tier` | text | `unverified`, `phone_verified`, `fully_verified` |
| `licence_number_hash` | text | Hashed trade licence — unique |
| `id_verification_status` | text | `not_submitted`, `pending`, `approved`, `rejected` |
| `subscription_tier` | text | `free`, `pro`, `team` |
| `subscription_status` | text | `active`, `inactive`, `trialling` |
| `stripe_customer_id` | text | |
| `organisation_id` | uuid | For business accounts |

### `public.trade_profiles`
One per tradesperson. Username is the public-facing slug.

| Column | Type | Notes |
|---|---|---|
| `username` | text | Unique — used in profile URLs |
| `trade_type` | text | e.g. `electrician`, `plumber` |
| `average_rating` | numeric(3,2) | Computed from reviews |
| `total_reviews` | int | |

### `public.client_profiles`
One per client. Includes trust scores visible to tradespersons.

| Column | Type | Notes |
|---|---|---|
| `payment_speed_score` | numeric(3,2) | |
| `scope_change_score` | numeric(3,2) | |
| `communication_score` | numeric(3,2) | |
| `red_flag_count` | int | Accumulated from tradespeople reviews |

## RLS policies

All tables have RLS enabled. Current policies:

- **users**: users can `SELECT` and `UPDATE` their own row
- **trade_profiles**: public `SELECT`; owner-only `INSERT`, `UPDATE`, `DELETE`
- **client_profiles**: owner-only `SELECT`, `INSERT`, `UPDATE`, `DELETE`

> Admin operations use the service-role client (`src/lib/supabase/admin.ts`) which bypasses RLS. This module must only be imported in server-side code (Server Components, Route Handlers, Server Actions).

## Supabase client usage

```ts
// Server Component or Route Handler
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client Component
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Admin / service-role (server only)
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()
```

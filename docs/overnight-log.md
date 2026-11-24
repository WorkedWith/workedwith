# Overnight build log: v4.2

Branch: `overnight/v4.2-build`. Built against `docs/prd-v4.2.md` and `docs/project-brief-v4.2.md`.
No migrations were run against any database. No Supabase CLI was available in the build container, so every
phase was checked with `npx tsc --noEmit`, `npm run lint` and `npm run build` only.

## 1. Progress

| Phase | Status | What was built |
|---|---|---|
| 0 Cleanup | Done | One plan with a 30 day trial, single "has active plan" check, boosts reworked to the £10 add on with a 3 per trade type cap, waiting list and admin switch, backdated and trade invite flows removed, old screens hidden, test data reset script |
| 0.5 Landing page | Done | Home, for trades, for clients, pricing and FAQ rewritten for the quote to paid platform, with the plain cost table, accounting names, shared nav and footer, and a slot for the landing video |
| 1 Getting paid setup | Done (mock provider) | Business details screen, bank details with Confirmation of Payee, account number encrypted, open banking connection through a swappable interface (mock and TrueLayer adapters), 90 day reconfirm prompts and lapse, usage tracking table |
<!-- progress -->

## 2. Decisions I made

| # | Decision | PRD |
|---|---|---|
| 0.1 | `subscription_tier` is no longer read anywhere but the column is kept until after launch, so a rollback is painless. | 21, 20 phase 0 |
| 0.2 | Existing trades with a paid Stripe subscription become `active`. Everyone else starts a fresh 30 day trial from the day the migration runs. | 3 |
| 0.3 | Existing grants are converted to "the plan". The founding offer button now gives 3 months free, and the helper lists trades working in WA14 or WA15, oldest first. | 3, 20 milestones |
| 0.4 | Grants never carry boosts, because boosts are billed on the Stripe subscription and are for the paid plan only. | 3, decision 17 |
| 0.5 | A trade who adds a card during the trial is `active` straight away, but Stripe's own trial runs to the same end date so nothing is charged early. Boosts stay locked until the trial date has passed. | 3, decision 17 |
| 0.6 | The 3 slot cap: a boost is refused if any of the trade's trade types already has 3 boosted trades in that district. The trade can then join the waiting list for those types. The first person waiting for a type is emailed when a slot frees up. | 15, decision 15 |
| 0.7 | Boosted trades appear twice: once in the labelled Boosted band, and again in their normal ranked place. Seeded listings are counted against real trades excluding the Boosted band copies. | 15 |
| 0.8 | Hidden screens redirect to the home page from middleware (`src/lib/hidden-routes.ts`). Their code and tables are untouched. This covers the old job flow, ended early status page, evidence route, organisations, business client sign up, client listings and the client claim flow. | 20 items 5 to 7, 23 |
| 0.9 | The client "Invite your trade to WorkedWith" email opens the client's own email app with a short note. WorkedWith sends nothing. | 25 decision 8 |
| 0.10 | Join as client goes straight to the person sign up. Person or company is set on the client account (phase 2). | 5 |
| 0.11 | Test data reset is a hand run script (`supabase/scripts/reset-test-data.sql`), not a migration, and it ends in `rollback` until you change it to `commit`. | 20 item 8, decision 11 |
| 0.12 | Vercel Hobby allows two crons, so all new daily v4.2 jobs run inside the existing 08:00 cron (`src/lib/cron/daily-v42.ts`). | 10 |
| 0.13 | Emails and texts are only sent when `MESSAGE_DELIVERY=live`, or on Vercel production. Everywhere else they are logged to the console. | your instructions |
| 0.14 | The notifications type check constraint is dropped so new notification kinds can be added without a migration each time. | 17 |
| 0.15 | Lapsed trades keep their public profile page at /t/[slug] (clients follow links from invoices) but are hidden from Find. | 3, 15 |

| 0.5.1 | No landing video exists in the repo. The pages show a video section only when `NEXT_PUBLIC_LANDING_VIDEO_URL` is set. | 19 item 11, 20 phase 0.5 |
| 0.5.2 | Accounting platforms are shown as plain wordmarks, not their logos, until we have permission to use each brand. | 18 |
| 0.5.3 | The Stripe card fee (1.5% + 20p) is quoted on the pricing page as the PRD says; check it before launch. | 3 |
| 1.1 | Bank account numbers are encrypted in the app with AES 256 GCM (`DATA_ENCRYPTION_KEY`), and only the last 4 digits are kept in clear for display. Clients see the full number only on invoices. | 11, key rule 10 |
| 1.2 | Provider tokens are stored encrypted in `provider_connection_id`. | 21 |
| 1.3 | The default open banking adapter is the mock (`OPEN_BANKING_PROVIDER=mock`). It shows a pretend bank picker; a name containing "wrong" fails Confirmation of Payee and "close" gives a close match. Incoming payments in mock mode are created with a Simulate button added in phase 5. | 19 item 1 |
| 1.4 | I wrote the real adapter for TrueLayer because it is first on the PRD shortlist. It asks for read only scopes (no payments). Confirmation of Payee returns "unavailable" until a verification product is contracted. | 19 item 1 |
| 1.5 | Changing bank details to a different account revokes the bank connection, because it would read the wrong account. | 4 |
| 1.6 | If the connected bank reports a different sort code and account number to the one on invoices, the connection is refused. | 4 |
| 1.7 | Reconfirm prompts start 7 days before the 90 day consent ends; after that matching pauses and the trade is told. Reconfirming reuses the bank approval flow (one tap in mock mode). | 9 |
| 1.8 | Business details (trading address, business and reply email, VAT number, invoice prefix, payment terms, part payments, default deposit, extra terms) are built in phase 1 because quotes and invoices need them. The invoice prefix locks after the first invoice. | 4 step 2, 18 |
| 1.9 | "Non refundable from payment" can't be a default, only picked on a quote to a company client. | 6 |
<!-- decisions -->

## 3. Needs Adam

1. Create one Stripe price at £19.99 a month (`STRIPE_PLAN_PRICE_ID`) and one at £10 a month for boosts (`STRIPE_BOOST_PRICE_ID`). Archive the old Standard and Pro prices.
2. Set `MESSAGE_DELIVERY=live` in Vercel production (it is also live automatically when `VERCEL_ENV=production`).
3. Check the counts printed by `supabase/scripts/reset-test-data.sql`, then change `rollback` to `commit` and run it once before the first real trade.
5. Supply the landing video and set `NEXT_PUBLIC_LANDING_VIDEO_URL` (and optionally `NEXT_PUBLIC_LANDING_VIDEO_POSTER`).
6. Logos for Xero, QuickBooks, FreeAgent and Sage, once each partner programme allows it.
4. Switch boosts on for WA14 and WA15 in Admin, Boosted Districts, when you are ready to sell them.
7. Choose the open banking provider (PRD 19 item 1). If it is TrueLayer, add `TRUELAYER_CLIENT_ID`, `TRUELAYER_CLIENT_SECRET`, `TRUELAYER_ENV`, register the redirect URL `https://workedwith.co.uk/api/open-banking/callback`, and test in their sandbox. If it is another provider, a new adapter beside `src/lib/open-banking/truelayer.ts` is needed.
8. Generate `DATA_ENCRYPTION_KEY` (run `openssl rand -base64 32`) and add it to Vercel before any trade saves bank details. Keep a safe copy: losing it means losing the stored account numbers.
<!-- needs -->

## 4. To run

**Migrations, in order**
1. `20261124000000_single_plan.sql`
2. `20261124000100_getting_paid_setup.sql`
<!-- migrations -->

**Env vars to add in Vercel**
- `STRIPE_PLAN_PRICE_ID`, `STRIPE_BOOST_PRICE_ID`
- `MESSAGE_DELIVERY` (`live` in production; leave unset or `log` in preview)
- `NEXT_PUBLIC_LANDING_VIDEO_URL`, `NEXT_PUBLIC_LANDING_VIDEO_POSTER` (optional)
- `DATA_ENCRYPTION_KEY` (required in production)
- `OPEN_BANKING_PROVIDER` (`mock` or `truelayer`)
- `TRUELAYER_CLIENT_ID`, `TRUELAYER_CLIENT_SECRET`, `TRUELAYER_ENV` (`sandbox` or `live`)
<!-- env -->

**Commands**
```bash
npm install
npx tsc --noEmit
npm run lint
npm run build
supabase db push
```

## 5. Test it

**Phase 0**
- Sign up as a new trade: the welcome page says the 30 day trial has started; /subscription shows days left and an Add a card button.
- Admin, Plan grants: give a trade the plan; the founding offer button gives 3 months.
- Admin, Boosted Districts: switch WA14 on. As a trade on the paid plan, boost WA14 from Profile, Operating areas. As a fourth trade of the same type, see the waiting list offer.
- Find: a boosted trade shows in the Boosted band with the label, and again lower down in its normal place.
- Visit /jobs/log, /org/dashboard, /invite/claim/x: each sends you home.
- Gallery allows 10 photos for every trade; featured jobs allow 3.

**Phase 0.5**
- Open /, /for-trades, /for-clients, /pricing and /faq at phone width and desktop width. No sideways scrolling; the menu button opens the links on a phone.
- Pricing shows £19.99 a month, the plain cost table and what every trade gets. No Standard or Pro anywhere.
**Phase 1**
- Profile, Business details: save name, address, emails, VAT number and invoice prefix.
- Profile, Getting paid: save bank details. Try an account name containing "wrong" (red warning) and "close" (amber warning).
- Connect my bank: pick a bank on the test bank page; you come back to Connected with a reconfirm date 90 days away.
- Disconnect, then choose "My bank isn't listed": the status shows Not connected and says payments can be marked by hand.

<!-- tests -->

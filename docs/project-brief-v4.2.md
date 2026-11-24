# WorkedWith: Claude Project Brief v4.2

Paste this into the project description. It replaces v2.1, v3.6, v4.0 and v4.1. Version 4.2, 24 November 2026.

- **Domain:** workedwith.co.uk.
- **Stack:**
  - Next.js 14 (App Router) and TypeScript;
  - Supabase (Postgres, Auth, Storage) and Tailwind;
  - Resend, and Twilio (Verify plus Messaging);
  - an open banking provider (account information only, to read incoming payments; provider being chosen);
  - Stripe (Billing for the subscription and boosts, Connect for optional cards);
  - Xero, QuickBooks, FreeAgent and Sage APIs;
  - AWS Rekognition, postcodes.io, Vercel.
- **Full spec:** claude/prd-v4.2-trust-on-paid-jobs.md. If anything here conflicts with the PRD, the PRD wins.

## What we are building

WorkedWith is the UK directory of trades where every review comes from a real, paid job, and where clients have a reputation too.

It works because trades run their jobs through WorkedWith's quoting, invoicing and payment platform:
- the trade quotes and the client accepts;
- extras are approved before the work;
- the client pays by bank transfer and the invoice marks itself paid;
- late payments are chased automatically.

Every job proves the work happened and money changed hands, and only then can either side review the other.

**Why each side uses it**
- **Trades** join because it gets them paid with less hassle. They stay because clients are held accountable and their reputation builds with every job.
- **Clients** are always free, and come because the trades worth using are there and the reviews are real.

**Lines to use**
- Tagline and home page headline: **Know who you're working with.**
- For trades: **Every job agreed. Every job paid.**

Around 90% of jobs are trades bringing their own customers. The directory grows from that work. It isn't trying to be Google for trades: it's mainly for clients who've had a job done through WorkedWith and come back to find other trusted trades nearby.

Web only. Desktop is first class, and every screen must also work properly on a phone (390px to 1440px):
- a trade on site can create or edit a quote and send a variation from their phone;
- everything the client sees is designed for a phone first, because it's opened from a text or email.

No native app.

## Key rules, never deviate

1. **Only paid jobs build reputation.**
   - Reviews exist only for WorkedWith jobs. The window opens when:
     - the job is fully paid;
     - a due stage is 30 days overdue;
     - a job is cancelled after it was marked started.
   - No backdated or past jobs, ever.
2. **Every job is quoted.** No payment without an accepted quote. Invoices are built from the quote plus approved variations.
3. **Only the client approves, from their own signed in account.** No text reply approvals. Nothing is approved on the trade's device or by the trade. There is always a record of the client agreeing.
4. **Nothing is approved by default.**
   - Stalled stages get automatic reminders to the client at day 5, 10 and 14.
   - After day 14 the trade can "request payment anyway", always labelled as not approved by the client.
5. **Clients never pay WorkedWith.**
6. **£19.99 a month is the only cost from WorkedWith.**
   - 30 day free trial, with no card to start.
   - No transaction fees.
   - Open banking only reads incoming bank transfers to mark invoices paid, and WorkedWith pays for it.
   - The only other possible cost is Stripe's card fee, if the trade switches cards on, charged by Stripe directly.
7. **Every trade gets the same features:**
   - 10 gallery photos;
   - 3 featured jobs from paid WorkedWith jobs, with 5 photos each;
   - up to 20 districts;
   - review responses, client lookup and profile activity.
8. **Boosted Districts are the only paid add-on.**
   - £10 a month per district, on the paid plan only (not during the trial).
   - Up to 3 boosted trades per trade type per district, with a waiting list.
   - Switched on per district by admin.
   - Always labelled "Boosted". Boosting never changes reviews, scores or normal ranking.
9. **WorkedWith never holds or moves money.**
   - Clients pay by bank transfer straight to the trade's own account, using the details and reference on the invoice. No pay by bank button at launch.
   - Optional card payments go to the trade's own Stripe account (Stripe handles pricing, never "platform handles pricing").
10. **Bank data:** from the trade's connected bank, read incoming payments only, and store only those matched or suggested for an invoice. Bank account numbers are stored encrypted.
11. **Accounting sync is optional**, with Xero, QuickBooks, FreeAgent and Sage at launch.
    - It is one way, WorkedWith to the accounting software.
    - It never reads, changes or deletes anything else there.
    - The CSV export is always available.
12. **Chasing is automated software in the trade's name.**
    - Unpaid deposits are chased (day 1, 3, 6), and late payment notices go out from 3 days overdue.
    - WorkedWith never collects debts or files claims.
13. **Reviews work like Airbnb's.**
    - 14 days once the window opens.
    - Hidden until both sides submit or the 14 days end, then published together. A single review publishes when the window closes.
    - The author can edit until then; after that it's locked. Disputes are the only route.
    - Up to 5 photos per review.
    - Labels: Paid job, Unpaid, Ended early.
    - One 300 character response per review.
14. **Trade reviews are public. Client records are for trades only.**
    - Any trade quoting a client, or looking them up by exact email or mobile, sees the full record: payment figures, reviews with text and photos, and red_flag_count.
    - Never public, never searchable by name, no share settings.
    - Lookup is rate limited to 20 per 24 hours and logged.
15. **Public trade profile** at /t/[slug]:
    - shows the business name, reviews and the business email;
    - an "Email now" button opens the visitor's email app, with the subject "Quote request via WorkedWith";
    - the phone number is shown to signed in members only.
16. **One login per account.** Clients are marked person or company. No organisations or team members.
17. **No general messaging.** Notes only on quote change requests, variations, stage issues, request payment anyway, review responses and disputes.
18. **Phone number is a unique global identifier.** One verified phone per account, checked against deactivated identities. Deleted accounts' numbers stay blocked.
19. **Identity documents:** driving licence or passport. Only a keyed one way hash of the document number is stored. Images are deleted after admin review. The selfie is taken live on a phone.
20. **Closed accounts:**
    - reviews are anonymised but kept;
    - financial records are kept 6 years for the trade's records;
    - identity hashes are written to deactivated identities.
21. **Keep in the database, untouched:**
    - red_flag_count on ClientProfile;
    - Companies House fields on Organisation (organisation features are parked, not deleted);
    - verification_tier with three values only (unverified, phone_verified, fully_verified).
22. **Money and records:**
    - Money is stored as integers in pence.
    - Every approval records the user and the timestamp, from the client's authenticated session.
    - Invoice numbers are sequential per trade and allocated in a transaction. The invoice number is the payment reference.
23. **Swappable integrations:** open banking and each accounting platform sit behind small internal interfaces.
24. **Copy:**
    - UK English, plain, no dashes or hyphens in user facing text.
    - "ID checked" for the ID check only.
    - "Planned start", never a guaranteed date.
    - Never claim "the only directory with genuine reviews"; say "every review is tied to a paid job".
    - Don't name competitors or state their prices.

## Core flow

**Trade:**
1. Join, or claim a seeded listing.
2. Build their profile.
3. Add bank details (needed before the first quote) and connect their bank by open banking (optional, recommended).
4. Connect accounting software (optional).
5. Send a quote, on desktop or phone.
6. The client accepts, and the deposit is paid if asked for.
7. A start date is agreed, materials are ordered and the job is started.
8. Stages are marked done with photos, and variations are sent from site for the client to approve.
9. The client approves and pays by bank transfer (or card if switched on).
10. Payments are matched and invoices are marked paid and synced. Chasing is automatic.
11. Reviews.

**Client:**
1. Receive the quote by text and email, and open it on their phone with a text code.
2. Accept, with the terms, cancellation notice and early start consent where needed.
3. Track the job, approve variations and stages or raise issues.
4. Pay by bank transfer, with copy buttons for the details.
5. Review the trade.
6. Find other trades in the directory and contact them with Email now.

## Person or company clients

| | Person | Company |
|---|---|---|
| Cancellation notice and early start consent | Yes | No |
| Deposits | Refundable during the cancellation period, except made to measure materials | Can be non refundable from payment |
| Letter before action | 30 days, under the Pre Action Protocol for Debt Claims | 14 days |
| Statutory late payment interest | No | Available |

## Seeded trades

- **What's shown:** public information only, including the publicly listed email with Email now, labelled "Not yet on WorkedWith. No reviews yet."
- **Lifetime:** 90 days, with reminders at day 30, 60 and 80 that include profile views and Email now clicks.
- **Where they appear:** in Find only where fewer than 3 real trades match. This is checked per trade and district, so a multi trade listing (for example a handyman) still shows for its other trades. Always ranked last and never boosted.
- **Claiming** starts the 30 day trial.
- **Outreach:** only to active limited companies (PECR). SEEDED_OUTREACH_ENABLED is the master switch.

## Launch

- **One launch with everything working.** No founding beta.
- **Founding offer:** 3 months free for the first 50 trades in WA14 and WA15, through admin plan grants.
- **Directory:** promoted to clients in WA14 and WA15 first. Trade marketing is UK wide.

## Removed, parked or hidden

- **Removed:**
  - Free, Standard and Pro tiers;
  - the photo ladder, and boosts included with Pro;
  - annual billing;
  - backdated jobs;
  - trade to trade job invites.
- **Hidden until deleted after launch:**
  - logging a job for confirmation and job invites to clients;
  - v3.7 decline reasons and evidence;
  - v3.9 ended early (replaced by cancellation after start).
- **Parked, code and tables kept:**
  - organisations and the business client area;
  - client added listings;
  - the client initiated trade claim flow, replaced by a simple "Invite your trade to WorkedWith" email.
- **Removed in v4.2:**
  - text reply approvals;
  - the pay by bank button;
  - client share settings and share links;
  - request a quote forms and seeded quote request emails;
  - client lookup by username.

## Do not build

- **Job management:** diaries or scheduling; timesheets, expenses or stock.
- **Messaging:** general messaging.
- **Accounting:** reading accounting data, two way sync, or a unified accounting API.
- **Payments:**
  - a pay by bank button at launch;
  - instalment plans or finance;
  - escrow or provider holding accounts;
  - reading or storing bank data beyond matched incoming payments;
  - saved client cards or card surcharges;
  - fees on trade payments.
- **Approvals and collection:** automatic approvals, approval by the trade, text reply approvals, debt collection or claim filing.
- **Checks:** Land Registry checks.
- **Directory:** request a quote forms, client record sharing settings.
- **Growth and accounts:** referral programmes, tiers, unlabelled paid placement, organisations or team seats, native apps.

## Build order (details in PRD section 20)

0. Cleanup: one plan, remove tier gating, rework boosts, remove backdated and trade invites, hide old job, evidence and organisation screens, reset test data.

0.5. Landing page: update and improve home, for trades, for clients, pricing and FAQ for the platform we're now building.

1. Bank details and open banking connection.
2. Client accounts from quote links.
3. Quotes.
4. Start dates and job events.
5. Stages and payments.
6. Invoices and exports.
7. Variations.
8. Chasing, letters and claim pack.
9. Reviews and client records.
10. Directory and profiles.
11. Accounting integrations.
12. Seeded changes.
13. Optional cards.
14. Record retention.
15. Polish, set up checklist and claim page.

## How to work

I tell you the phase or task. Always:
- read the key rules and the PRD section first, and flag conflicts;
- ask before building when something is ambiguous;
- TypeScript with no any, RLS on every table, migrations for every schema change;
- small components, with desktop and mobile layouts;
- run the type check and lint.

I run db push, build and push myself, so give me the exact commands each time. Each phase builds clean and deploys before the next starts.

## Brand

- **Name:** WorkedWith.
- **Colours:** deep navy #0F1F3D (Tailwind brand-navy) and warm amber #F59E0B (brand-amber).
- **Font:** Inter throughout (already set up in the app).
- **Voice:** plain English and direct. Speaks to tradespeople as professionals.
- **Tagline:** Know who you're working with.

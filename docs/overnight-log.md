# Overnight build log: v4.2

Branch: `overnight/v4.2-build`. Built against `docs/prd-v4.2.md` and `docs/project-brief-v4.2.md`.
No migrations were run against any database. No Supabase CLI was available in the build container, so every
phase was checked with `npx tsc --noEmit`, `npm run lint` and `npm run build` only.

## Summary

All 16 phases (0, 0.5 and 1 to 15) are built, each committed and pushed with type check, lint and build passing. Everything that needs an outside service works end to end in mock mode (open banking, text codes, accounting, cards, Companies House), with real adapters written as far as the public docs allow. Nothing has been run against a database: see Needs Adam item 1.

**Known gaps**
- Not tested against a real database or real providers (no keys, no Supabase CLI in the build container).
- Real adapter TODOs: Confirmation of Payee, provider webhooks for instant matching, QuickBooks items and tax codes, refunds in QuickBooks, FreeAgent and Sage, card fee bank charges in accounting, chargeback evidence PDF upload to Stripe.
- No automated tests were added; the repository has none to extend.
- Privacy policy and terms pages are not rewritten (needs the solicitor review).
- Trade logo is not on invoice PDFs.
- Old v3 screens are hidden, not deleted (as the PRD says); delete after launch.

## 1. Progress

| Phase | Status | What was built |
|---|---|---|
| 0 Cleanup | Done | One plan with a 30 day trial, single "has active plan" check, boosts reworked to the £10 add on with a 3 per trade type cap, waiting list and admin switch, backdated and trade invite flows removed, old screens hidden, test data reset script |
| 0.5 Landing page | Done | Home, for trades, for clients, pricing and FAQ rewritten for the quote to paid platform, with the plain cost table, accounting names, shared nav and footer, and a slot for the landing video |
| 1 Getting paid setup | Done (mock provider) | Business details screen, bank details with Confirmation of Payee, account number encrypted, open banking connection through a swappable interface (mock and TrueLayer adapters), 90 day reconfirm prompts and lapse, usage tracking table |
| 2 Client accounts | Done (mock text codes) | Clients are found by mobile then email, or created with no password. Links in texts and emails open with a text code to the client's own mobile and sign them in. Person or company confirmed on first visit. Sign in later by text code or email link. Client area at /my with My jobs, Find a trade, My record |
| 3 Quotes | Done | Phone first quote builder (client, job, lines, saved items, copy a past quote, VAT, deposit with refund settings, on completion or stages by amount or percentage, planned start, photos, preview), drafts and versions, send by text and email, follow ups and expiry, unpaid deposit reminders at day 1, 3 and 6 with expiry at day 7 and extend, client quote page with accept (terms, cancellation notice, early start consent), ask for changes and decline, trade Jobs list with filters, trade job page, client My jobs and job page |
| 4 Start dates and job events | Done | Propose, confirm, counter and change planned starts from either side, materials ordered with an optional receipt photo, mark started (blocked inside a person client's 14 days without consent, with a request button), early start consent from the client's account, and a job history timeline on both job pages |
| 5 Stages and payments | Done (mock bank) | Mark done with photos, approve or raise an issue with photos, issue notes thread, resubmit, reminders at day 5, 10 and 14 plus a once a day manual reminder, request payment anyway after 14 days (always labelled not approved by the client), invoices with sequential numbers issued when a stage becomes due, bank details with copy buttons, "I've paid", automatic matching (exact, part payment, overpayment, probable match to confirm), daily bank sync, mark received, paid elsewhere with client confirmation, refunds with client confirmation, receipts, cancellation by either side with the deposit position, made to measure question, and a test mode "simulate a bank transfer" |
| 6 Invoices and exports | Done | Invoice pages for both sides (client page with copy buttons), invoice and credit note PDFs (HMRC VAT fields when VAT registered, PAID stamp, "requested by the trade" label), credit notes with their own sequential numbers issued for refunds, invoices and credit notes list on both job pages, and exports for any date range: invoices, payments (with Stripe fees) and credit notes as CSV, plus all invoices as one PDF |
| 7 Variations | Done | The trade adds a variation (addition or reduction, photos, note, the stage it goes on or a new stage) from the job page on a phone; it goes to the client by text and email; the client approves or declines with a note in their account; approved changes update the stage and job total for both sides and show on the invoice; withdraw while waiting |
| 8 Chasing, letters and claim pack | Done | Daily chasing on every due stage (2 days before, due date, 3, 7 and 14 days late) by text and email in the trade's name with the bank details and reference, a 21 day prompt to the trade, the review window at 30 days, overdue status, "I've paid" pause of 3 working days, pause, resume and stop per job, letter before action (person: 30 days with information sheet and reply form; company: 14 days with optional statutory interest and fixed compensation) previewed and sent with one tap, readable by the client, and a claim pack PDF with the Money Claim Online figures, terms, acceptance record, events, variations, stages with photos, issues, payments, reminders and all invoices |
| 9 Reviews and client records | Done | Review windows open on full payment, 30 days overdue, or cancellation after work started; 14 days for both sides with reminders at day 3 and 10; hidden until both submit or the window ends, then published together (a single review publishes alone at the close); edit until then, then locked; up to 5 photos; labels Paid job, Unpaid (updates to Paid job if later paid) and Ended early; responses and disputes reuse the existing routes. Client record with a good payer summary, payment figures, reviews from trades with photos, labels and red flags, shown to quoting trades (open, or within 12 months) and on lookup by exact email or mobile (20 a day, logged), and to the client on My record. Username lookup and /c pages removed |
| 10 Directory and profiles | Done | Email now on member and seeded profiles (address put together in the browser on tap, then shown as text; rate limited per visitor; clicks counted), phone for signed in members only, paid jobs on WorkedWith and member since on cards and profiles, featured jobs only from paid WorkedWith jobs with an automatic title (job type, month, district), Log a job removed, profile activity (views and Email now clicks, 30 and 90 days) for every trade, seeded profiles labelled "Not yet on WorkedWith. No reviews yet." with view tracking |
| 11 Accounting integrations | Done (mock); real adapters need keys | One internal interface (connect, refresh, contact, invoice, payment, credit note, refund, disconnect) with a working mock and adapters for Xero, QuickBooks, FreeAgent and Sage written to their public APIs. Connect from Getting paid, confirm sales account, bank account, VAT and whether to send existing invoices. Invoices, payments (paid elsewhere once the client confirms), credit notes and refunds queue automatically, retry for 24 hours, then show as failed with a retry button. Expired connections pause sync and catch up on reconnect; lapsed plans pause sync. Sync status shows on each invoice |
| 12 Seeded changes | Done | Listings live 90 days (existing ones extended), reminder emails at day 30, 60 and 80 that include the month's profile views and Email now clicks, then removal onto the do not reseed list; outreach only to active limited companies checked at Companies House (number added on the admin form), email only, opt out in every email; seeded profiles show Companies House status and trading since; claiming starts the 30 day trial, carries the listed email over as the business email, and lands on the set up steps |
| 13 Optional cards | Done (mock); live needs Stripe Connect | Trades connect their own Stripe account (Stripe handles pricing, no application fee), switch cards on or off and set a card limit per payment; clients pay a due stage by card, Apple Pay or Google Pay (in full, or in parts of £10 or more) above which they see bank only; payments arrive by Connect webhook with Stripe's fee recorded for exports and sync; card refunds through Stripe with a credit note; chargebacks open automatically with a text and email to the trade, evidence is built from the job record and submitted with one tap, a reminder goes 3 days before the deadline, and a lost chargeback makes the stage due again and counts on the client's record |
| 14 Record retention | Done | Accounts with WorkedWith jobs are closed instead of deleted: identity hashes blocked, reviews anonymised but kept, login removed (scrubbed email, banned), personal details scrubbed; a closing trade has the bank and accounting connections revoked, bank details deleted (issued invoices keep a frozen encrypted copy), cards off, plan cancelled, open quotes withdrawn and listing hidden. Daily retention sets a 6 year date on paid or cancelled jobs and then anonymises them (names, contacts, addresses, notes, photos and letters go; amounts, numbers and dates stay). Unanswered bank match suggestions are forgotten after 90 days. Accounts with no WorkedWith jobs still use the existing full delete |
| 15 Home, navigation, polish, claim page | Done | New trade home (owed to you, overdue, awaiting approval, paid this month; a "Needs you" list of payments to confirm, start dates, stages you can request, issues, bank and accounting problems, chargebacks, deposit refunds and reviews to write; set up checklist; one New quote button; trial ending notice; client lookup and profile activity), bottom tab bar on phones with the top bar on larger screens, claim page selling the platform, and an admin Platform page (plans, rolling 12 month revenue against the VAT threshold, jobs needing attention, bank connection health and open banking usage, accounting sync by platform, review windows, seeded outreach, quotes sent, accepted and paid per week) |
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
| 2.1 | The existing `client_type` values are kept: `individual` means a person and `business` means a company, so no data migration is needed. | 5, 21 |
| 2.2 | Links in texts and emails go to `/open/<token>`. Only a hash of the token is stored, links last 180 days, and opening one always needs a text code to the client's own mobile, so every approval comes from their signed in session. | 3, 5, key rule 3 |
| 2.3 | Sessions are created on the server after the text code is checked, using a one time Supabase magic link token. No password is ever set for clients. | 5 |
| 2.4 | When a trade quotes a mobile or email that already has an account, the quote attaches to it. The trade's person or company choice only fills in an account the client has not confirmed yet; the client's own answer always wins. | 5, 6 |
| 2.5 | A trade who is also a client becomes user type `both`. | 2 rule 13 |
| 2.6 | Text codes use Twilio Verify. With no Verify service set up outside production (or `OTP_PROVIDER=mock`), the code is always 123456 and nothing is sent. Codes are rate limited (5 sends an hour, 8 checks in 10 minutes). | 5 |
| 2.7 | Client only users go to /my/jobs instead of the old dashboard. Client nav is My jobs, Find a trade, My record, Account. | 18 |
| 2.8 | The Companies House number for company clients is optional free text and never checked. | 21, 24 |
| 3.1 | New jobs live in the existing `jobs` table with `flow = 'quote'`; old v3 jobs keep `flow = 'legacy'` and still open in the old job view. The status check allows both sets of statuses until the old flow is deleted. | 20, 21 |
| 3.2 | A quote can be edited and resent (a new version) until it is accepted. After acceptance, changes go through variations (phase 7). Older versions are kept and shown as "Replaced by a newer version" (an extra internal status, `superseded`). | 6, 8 |
| 3.3 | Stage amounts and the deposit are VAT inclusive (they add up to the quote total). Invoices split each amount into net and VAT in the same proportion as the quote. | 6, 11 |
| 3.4 | The client type used for the job is the client's own confirmed type at the moment they accept, saved on the quote and job. "Non refundable from payment" can only be picked for company clients, and a quote using it can't be accepted by a person. | 5, 6 |
| 3.5 | Early start consent at acceptance is optional for the client. If they don't give it, the trade can't mark the job started inside the 14 days and can ask for it later (phase 4). | 7 |
| 3.6 | Accepting creates the payment stages straight away. The deposit stage is due at once (accepting is the approval). The job stays `quoted` until the deposit is paid, then becomes `booked`; with no deposit it is booked on acceptance. | 6, 9 |
| 3.7 | Quote follow ups run once a day from the shared cron. Each follow up is recorded so it is only ever sent once. Deposit reminders can't be switched off because they are part of the payment flow. | 6, 17 |
| 3.8 | Photos on quotes, stages and variations go to a private storage bucket `job-photos` and are shown through signed links. The existing Rekognition moderation runs when AWS keys are set. | 6, 13 |
| 3.9 | Sending a quote needs bank details and an active trial or plan. Drafts can always be saved. | 3, 4 |
| 3.10 | Trade navigation is Home, Jobs, Client lookup, Profile. The PRD lists Home, Jobs, Profile; I kept Client lookup in the bar because it is a core daily tool. | 18 |
| 4.1 | A client confirming, or suggesting, a date inside their 14 day cancellation period must tick the early start consent to do so; otherwise they pick a later date. | 7 |
| 4.2 | The Materials ordered button shows when the deposit covers materials. | 7 |
| 4.3 | A `job_events` table records every event with who did it and when. It feeds the history on both job pages and later the claim pack and chargeback evidence. | 10, 21 |
| 4.4 | The early start request can be sent again at most once a day. | 7 |
| 4.5 | "Needs a start date" after 14 days booked is shown on the trade home (phase 15); nothing is sent to the client automatically. | 7 |
| 5.1 | Invoices and sequential numbering are built in phase 5, not 6, because the invoice number is the payment reference matching needs. Numbers come from a database function that increments the trade's counter in one statement, so they never skip or repeat. Phase 6 adds PDFs, credit notes and exports. | 11, 20, key rule 22 |
| 5.2 | Matching: a reference that contains the invoice number (ignoring spaces, case and leading zeros) is a match. Same amount as the balance marks it paid; less is a part payment; more records the balance and flags an overpayment to the trade. With no usable reference, a payment only becomes a suggestion if exactly one open invoice has that balance and the payer name contains a word of the client's name. Anything else is ignored and not stored. A rejected suggestion keeps only the transaction id, so it isn't suggested again. | 9, key rule 10 |
| 5.3 | Bank sync runs once a day in the shared cron, and is skipped for trades whose trial or plan has ended. Provider notifications (webhooks) are left as a TODO until the provider is chosen. | 9 |
| 5.4 | Raising an issue on a stage already requested by the trade keeps it due (the issue stays visible on the record); on a stage awaiting approval it pauses the stage. | 9, 10 |
| 5.5 | A client approving a requested stage changes its label to approved, and the invoice's approval basis changes too; the original request stays in the history. | 9 |
| 5.6 | Cancelling: stages not started are cancelled; anything due stays due. An unpaid deposit on a job that never started is cancelled. If the deposit position depends on made to measure materials, the trade is asked and the answer is recorded. Deposit disputes go through WorkedWith support for now (the existing dispute route is for reviews). | 9 |
| 5.7 | Part payments of £10 or more are by the client's own bank transfer; the pay panel says so when the trade allows part payments. Card part payments come with phase 13. | 9 |
| 5.8 | Paid elsewhere payments mark the stage paid straight away so chasing stops, but they only count on the client's record once the client confirms (phase 9 uses `client_confirmed_at`). | 9, 14 |
| 6.1 | PDFs are made with `pdf-lib` (new dependency, plain JavaScript, no server binaries) in plain Helvetica. The trade's logo is not on the PDF yet. | 11 |
| 6.2 | PDFs are generated on request rather than stored, so `pdf_path` stays empty. Invoices never change after issue, so the PDF is always the same; only the paid amounts and PAID stamp update. | 11 |
| 6.3 | Credit notes are numbered `<prefix> CN 0001` with their own counter, allocated the same safe way as invoice numbers. An invoice fully covered by credit notes shows as credited. | 11 |
| 6.4 | CSV money columns are pounds with two decimals; cells starting with = + minus or @ are escaped to stop spreadsheet formula injection. The default export range is the current UK tax year. | 11 |
| 6.5 | Exports have no plan check, so they stay available after a trial lapses or the plan is cancelled. | 3, 11 |
| 7.1 | A variation goes on a stage that is not yet due (upcoming, awaiting approval or issue raised), or on a new stage of its own for additions. Reductions must come off an existing stage and can't take it below zero. Money already invoiced is corrected with a refund and credit note instead. | 8, 11 |
| 7.2 | Variations can be added while the job is booked or in progress, and need an active trial or plan to send. | 3, 8 |
| 7.3 | Approved variations are listed as their own lines on the stage's invoice. | 11 |
| 8.1 | Only the latest step due is sent, so a missed day never sends a backlog. Each step is sent once per stage. | 10 |
| 8.2 | Chasing skips a job whose trade's trial or plan has ended, a paused or stopped job, and a stage the client said they had paid for 3 working days. Deposits are never chased here (they have their own reminders) and never reach a letter. | 3, 10 |
| 8.3 | The review window opening at 30 days overdue is not affected by pausing or stopping chasing, so non payment can always be reviewed. | 13 |
| 8.4 | A letter can be sent once an invoice is 21 days overdue, at most once every 7 days. The figures are saved with the letter so the PDF is always what was sent. The client gets an email with a link to read it in their account; the trade downloads the PDF to post. Email attachments are not used. | 10 |
| 8.5 | The person letter, information sheet and reply form follow the shape of the Pre Action Protocol but are my wording, not the official annexes. Both letters and all chasing copy need the solicitor review. | 10, 19 |
| 8.6 | Statutory interest uses `LATE_PAYMENT_REFERENCE_RATE` plus 8%, simple, from each due date to the letter date. The default reference rate is a placeholder of 4%. Fixed compensation is £40, £70 or £100 per invoice by size. | 10 |
| 8.7 | The claim pack embeds up to 4 JPG or PNG photos per stage; other formats are listed by file name. The court fee is not calculated; the pack tells the trade to add it from the current fee table. | 10 |
| 9.1 | v4.2 review windows live in the existing `review_windows` table with `flow = 'quote'`; the old cron logic now only touches `legacy` windows. The existing reviews table, dimensions and score calculation are reused. | 13, 23 |
| 9.2 | Reviews on v4.2 jobs are written on the job page (both sides), not the old review page. The written review limit stays at 500 characters as in the existing flow. | 13 |
| 9.3 | Payment figures: "paid on time" counts stages paid by their due date, excluding stages paid only after a trade request (shown separately). Average days to pay runs from approval (or the due date) to payment. Unconfirmed paid elsewhere payments don't count. "Disputes" counts payments the client disputed; lost chargebacks arrive with phase 13. | 14 |
| 9.4 | A quoting trade sees the record while any quote or job with the client is open, and for 12 months after it was last updated. | 14 |
| 9.5 | Every time a record is shown to a quoting trade on sending a quote, and on every lookup, it is logged in `client_record_views`. | 14 |
| 9.6 | Review photos go through the same upload and moderation as job photos and are stored privately; they show through signed links. | 13 |
| 10.1 | Email now uses the business email set in Business details. If a trade hasn't set one, no Email now button shows (the account login email is never published). | 15 |
| 10.2 | Email now is limited to 15 taps per visitor (by IP address) per day. The address is returned by a server action only on tap, never in the page source. | 15 |
| 10.3 | The phone shown to signed in members is the business phone from Business details, falling back to the verified mobile. | 15 |
| 10.4 | Featured job titles are generated from the job (type, month paid, postcode district taken from the job address), so a client's name or address can't appear. Older featured jobs not linked to a paid WorkedWith job are kept but hidden. | 15 |
| 10.5 | The v3.7 confirmation rate and v3.9 ended early labels are hidden on profiles and cards (the code stays). Hired again and Insured stay. | 23 |
| 11.1 | Listing the trade's accounts once at set up (so they can pick the sales and bank accounts) is the only read we do. Nothing else is ever read, changed or deleted. | 12 |
| 11.2 | `ACCOUNTING_MODE=mock` (the default) uses the mock for all four platforms. A client name containing "fail" makes the mock fail, to try the retry screens. `ACCOUNTING_MODE=live` switches to the real adapters. | 12 |
| 11.3 | Xero contacts are matched by name before creating; QuickBooks customers by display name; FreeAgent and Sage create a contact the first time a client is synced, then reuse it. | 12 |
| 11.4 | Sync happens straight after the event (with any failure caught) and again in the daily cron. Retries back off 5, 15, 60, 180, 360 minutes over 24 hours, then the item is marked failed and the trade is told. A sync failure never blocks the job or the payment. | 12 |
| 11.5 | Card fee bank charges, QuickBooks items and tax codes, and refunds for QuickBooks, FreeAgent and Sage are marked TODO in the adapters: they need sandbox testing to get right. | 12 |
| 12.1 | The day 0 email still goes when a listing is added (if allowed); the reminders count from the day the listing was created, so removal is always at day 90. | 16 |
| 12.2 | Seeded outreach is email only. Texts are never sent to seeded listings, because phone numbers are never seeded for outreach. The old text code stays but is no longer called. | 16 |
| 12.3 | Outreach needs: an email, a Companies House number, status active and a limited company type (ltd, plc, LLP and similar). Anything else is listed but never contacted. | 16, PECR |
| 12.4 | With no `COMPANIES_HOUSE_API_KEY` the status can't be checked, so nothing is emailed. `COMPANIES_HOUSE_MODE=mock` treats any number as an active limited company, for testing. | 16 |
| 12.5 | Client added listings (parked) are never emailed by us. | 16, 23 |
| 13.1 | Connected accounts are created with Stripe's controller settings (fees paid by the account, losses owned by Stripe, full Stripe dashboard), which is the "Stripe handles pricing" set up. WorkedWith never sets an application fee. | 3, 9, 24 |
| 13.2 | Card payments are direct charges on the trade's account through Stripe Checkout, so no client card is saved and there is no surcharge. | 9, 24 |
| 13.3 | `CARDS_MODE=mock` (default) simulates onboarding and a test checkout page that records a card payment with a pretend Stripe fee. | your instructions |
| 13.4 | The chargeback evidence is sent to Stripe as text (the acceptance record and full job timeline). Attaching the job report PDF as a file is a TODO for Stripe test mode. | 9 |
| 13.5 | Connect events arrive at the existing Stripe webhook; events with an `account` field are routed to the Connect handler. | 9 |
| 14.1 | A hard delete would cascade into quotes and block on invoices, so accounts with v4.2 jobs are closed (scrubbed and locked) instead. The users row stays so the trade's records keep their links. | 11 |
| 14.2 | Every invoice now stores an encrypted copy of the bank details it was issued with, so closing a trade account can delete the live bank details without changing what clients were told. | 11 |
| 14.3 | Anonymisation after 6 years keeps invoice numbers, amounts, VAT and dates, so totals in exports still add up; everything personal goes. | 11 |
| 14.4 | Emails to a closed account's scrubbed `.invalid` address are never sent. | 11 |
| 14.5 | The client's own copy: when a trade closes, the client still opens their jobs, invoices and receipts. When a client closes, their login is gone, so they keep no access; the trade keeps the job record with the name and address as quoted. | 11 |
| 15.1 | The old dashboard code stays (hidden) behind `LEGACY_DASHBOARD=true`, so it can be compared before it is deleted. | 20 |
| 15.2 | The bottom tab bar shows below 640px; at tablet width and up the links sit under the header. | 18 |
| 15.3 | Open banking cost per trade uses `OPEN_BANKING_COST_PER_CONNECTION_PENCE` until the provider's price is known. Revenue comes from Stripe paid invoices, or an estimate from active subscribers if Stripe isn't set up. | 3, 18 |
<!-- decisions -->

## 3. Needs Adam

In priority order. Items 1 to 6 block a working deploy; the rest block going live with each integration.

1. **Apply the migrations to a test project first** (not production) and click through the test list below. Nothing was run against a database overnight; the code only type checks and builds. Expect a few query or policy fixes once it runs for real.
2. **`DATA_ENCRYPTION_KEY`**: generate with `openssl rand -base64 32` and add to Vercel before any trade saves bank details. Keep a safe copy: losing it loses the stored account numbers. Production refuses to run without it.
3. **Stripe prices**: one at £19.99 a month (`STRIPE_PLAN_PRICE_ID`) and one at £10 a month for boosts (`STRIPE_BOOST_PRICE_ID`). Archive the old Standard and Pro prices.
4. **Message delivery**: set `MESSAGE_DELIVERY=live` in production only (it is also live automatically when `VERCEL_ENV=production`). Previews stay on `log`.
5. **Twilio Verify and Supabase Auth**: confirm `TWILIO_VERIFY_SERVICE_SID` in production; allow the magic link redirect `https://workedwith.co.uk/auth/callback`.
6. **Cron**: all new daily jobs run inside the existing 08:00 cron (`/api/cron/publish-reviews`). If you move to Vercel Pro, bank matching would benefit from running hourly.
7. **Open banking provider** (PRD 19 item 1). If TrueLayer: add `TRUELAYER_CLIENT_ID`, `TRUELAYER_CLIENT_SECRET`, `TRUELAYER_ENV`, register `https://workedwith.co.uk/api/open-banking/callback`, and test in their sandbox. Another provider needs a new adapter beside `src/lib/open-banking/truelayer.ts`. Also set `OPEN_BANKING_COST_PER_CONNECTION_PENCE` once priced.
8. **Accounting apps** (PRD 19 item 2): register with Xero, Intuit, FreeAgent and Sage, register `https://workedwith.co.uk/api/accounting/callback`, add the ids and secrets, test each adapter in its sandbox (the TODOs in `src/lib/accounting/*.ts` mark what needs checking), then set `ACCOUNTING_MODE=live`. Check Xero's partner tier.
9. **Stripe Connect** for cards: enable Connect, add the connected account events (`checkout.session.completed`, `account.updated`, `charge.dispute.created`, `charge.dispute.closed`) to the existing webhook, test in test mode, then `CARDS_MODE=live`. Confirm the 1.5% + 20p figure.
10. **Solicitor review** (PRD 19 item 3): standard terms, cancellation notice and early start consent (`src/lib/quotes/wording.ts`), deposit wording, request payment anyway wording, both letters before action with the information sheet and reply form (`src/lib/pdf/lba-pdf.ts`), all chasing copy (`src/lib/email/templates-v42.ts`, `src/lib/sms/copy-v42.ts`) and the review rules.
11. **Legal check on the client record** (PRD 19 item 4), and the privacy notice clients see when they first open a link (currently one line linking to /privacy). Update the privacy policy and terms pages for payments, bank data, accounting, client records, reviews and retention (PRD 19 item 10); I only changed the pricing paragraph in the terms.
12. **`LATE_PAYMENT_REFERENCE_RATE`**: set the current Bank of England reference rate; update each January and July.
13. **Accountant check** of the invoice layout and export columns (PRD 19 item 9).
14. **Companies House**: confirm `COMPANIES_HOUSE_API_KEY` is set, then turn `SEEDED_OUTREACH_ENABLED=true` when ready. Confirm the PECR position (PRD 19 item 6).
15. **Test data reset**: run `supabase/scripts/reset-test-data.sql`, check the counts, change `rollback` to `commit`, run once before the first real trade.
16. **Boosts**: switch WA14 and WA15 on in Admin, Boosted Districts when ready to sell them.
17. **Landing video and logos**: set `NEXT_PUBLIC_LANDING_VIDEO_URL` (and poster); accounting brand logos once allowed.

## 4. To run

**Migrations, in order**
1. `20261124000000_single_plan.sql`
2. `20261124000100_getting_paid_setup.sql`
3. `20261124000200_client_accounts.sql`
4. `20261124000300_quotes.sql` (also creates the private `job-photos` storage bucket)
5. `20261124000400_job_events.sql`
6. `20261124000500_stages_payments.sql` (includes `allocate_invoice_number`)
7. `20261124000600_credit_notes.sql`
8. `20261124000700_variations.sql`
9. `20261124000800_chasing.sql`
10. `20261124000900_reviews_client_record.sql`
11. `20261124001000_directory_profiles.sql`
12. `20261124001100_accounting.sql`
13. `20261124001200_seeded_v42.sql`
14. `20261124001300_cards.sql`
15. `20261124001400_retention.sql`
<!-- migrations -->

**Env vars to add in Vercel**
- `STRIPE_PLAN_PRICE_ID`, `STRIPE_BOOST_PRICE_ID`
- `MESSAGE_DELIVERY` (`live` in production; leave unset or `log` in preview)
- `NEXT_PUBLIC_LANDING_VIDEO_URL`, `NEXT_PUBLIC_LANDING_VIDEO_POSTER` (optional)
- `DATA_ENCRYPTION_KEY` (required in production)
- `OPEN_BANKING_PROVIDER` (`mock` or `truelayer`)
- `TRUELAYER_CLIENT_ID`, `TRUELAYER_CLIENT_SECRET`, `TRUELAYER_ENV` (`sandbox` or `live`)
- `OTP_PROVIDER` (`twilio` or `mock`; leave unset in production)
- `LATE_PAYMENT_REFERENCE_RATE` (for example `4.0`)
- `ACCOUNTING_MODE` (`mock` or `live`)
- `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`
- `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_ENV` (`sandbox` or `live`)
- `FREEAGENT_CLIENT_ID`, `FREEAGENT_CLIENT_SECRET`, `FREEAGENT_ENV` (`sandbox` or `live`)
- `SAGE_CLIENT_ID`, `SAGE_CLIENT_SECRET`
- `COMPANIES_HOUSE_MODE` (`mock` only for testing; leave unset in production)
- `CARDS_MODE` (`mock` or `live`)
- `OPEN_BANKING_COST_PER_CONNECTION_PENCE` (for the admin cost estimate)
- `LEGACY_DASHBOARD` (leave unset)
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

**Phase 2**
- Phase 3 creates real links. To test now, insert a `client_access_links` row for a client (see `createAccessLink` in `src/lib/clients/accounts.ts`), open `/open/<token>`, tap Text me a code, enter 123456. You land on Who is the work for?, then My jobs.
- Sign out, go to Sign in, tap Sign in with a text code, enter the client's mobile and 123456.
- Sign in, Email me a sign in link: the link signs you in (needs Supabase email set up).

**Phase 3**
- As a trade with bank details: Home, New quote. Fill client (use your own second mobile and email), job title and one line, Send. You land on the job page with "Quote sent". In development the text and email are printed in the server log.
- Open the `/open/...` link from the log, enter 123456, confirm person or company, read the quote, tick the boxes and accept. The trade gets an "accepted" notification.
- Try a quote with a deposit: the client sees the deposit wording and the job waits for the deposit. On the trade job page, Give 7 more days works.
- Try Ask for changes: the trade sees the note, Edit and resend makes version 2, and the client must accept again.
- At phone width (390px), check the builder: add lines, use a saved item, switch to stages and use the percentage box, Preview, Send.

**Phase 4**
- After a quote is accepted (and deposit paid, or no deposit), on the trade job page propose a start date. The client confirms it, or suggests another, from their job page. Try a date inside 14 days as a person client: the consent box appears.
- Mark job started inside the 14 days without consent: you see the explanation and can send the request. The client answers yes; you can then mark started.
- With a deposit for materials, tap Materials ordered and add a photo; the client gets a message and the history shows it.

**Phase 5**
- With a booked job (deposit paid or none): mark the job started, then Mark done on a stage with a photo from your phone. The client approves from their job page; an invoice number appears on the stage.
- As the client, the due stage shows the bank details with Copy buttons and the reference. Tap I've paid: the trade sees the pause.
- In Profile, Getting paid (test mode), Simulate a bank transfer with the exact amount and the invoice number as the reference: the stage shows paid and a receipt is logged. Try a smaller amount (part payment), no reference with the client's surname (probable match to confirm on the job), and a random one (ignored).
- Raise an issue as the client with a photo, reply as the trade, then Fixed: resubmit.
- Mark payment received as cash: the client is asked to confirm. Mark a refund: the client is asked to confirm receipt.
- Cancel a job with a non refundable materials deposit after materials ordered (kept), and as a person client inside 14 days (trade asked about made to measure).
- To check day 5, 10 and 14 reminders and request payment anyway, set `marked_done_at` back 15 days on a stage in the database and run the cron (`/api/cron/publish-reviews` with the cron secret).

**Phase 6**
- Open an invoice from a job (trade) and from the client's job page; Download PDF opens a PDF with the right number, totals and bank details. Pay it with a simulated transfer: the PDF shows PAID.
- Mark a refund on a payment: a credit note appears on both job pages and as a PDF.
- Profile, Exports: download each CSV and the PDF bundle for a range that includes your test invoices; open the CSVs in a spreadsheet.
- Check the client invoice page at 390px: every bank detail has a Copy button.

**Phase 7**
- On a booked or in progress job, at phone width: + Add a variation, take a photo, price it, pick the final stage, Send. The client sees Changes to approve at the top of their job page and approves it: the stage amount and job total go up, and the history records it.
- Send a reduction and decline it as the client with a note: the trade sees the note.
- Mark that stage done and approve it: the invoice shows the variation as its own line.

**Phase 8**
- Make a stage due (approve it), then set its `due_at` to 2 days ahead and run the cron: a heads up is logged. Move it to 3, 7, 14 days in the past and run again: each notice is logged once. Tap I've paid as the client and run again: nothing is sent.
- Pause and resume chasing on the job.
- Set `due_at` 22 days back: the trade is prompted, and Letter before action opens. Preview the PDF as a person client and as a company client (tick interest). Send it: the client sees the red notice and can read it.
- Set the letter's `response_due_at` in the past: Download the claim pack and check every section.

**Phase 9**
- Pay every stage on a job (simulated transfers): both sides get "You can now review". Write a review with a photo as the trade: the client sees nothing yet. Edit it. Write the client's: both publish together, labelled Paid job.
- On another job, set a stage `due_at` 31 days back and run the cron: the window opens and the review is labelled Unpaid. Pay it: the label changes to Paid job.
- Cancel a started job: the window opens, labelled Ended early. Cancel an unstarted one: no window.
- Set a window's `window_closes_at` in the past with one review in and run the cron: it publishes alone.
- Client lookup: enter a client's exact email, then mobile. Try a partial email (refused). Do 21 lookups (the 21st is refused).
- As the client, open My record.

**Phase 10**
- Set a business email, then open your public profile signed out: the bar shows Email now and "Sign in to see their phone". Tap Email now: your email app opens with the subject "Quote request via WorkedWith" and the address shows as text. View source: the address is not there.
- Signed in as another user: Call appears.
- Home shows profile views and Email now clicks for 30 and 90 days.
- With a paid job, Profile, Photos, Featured jobs: only paid jobs can be picked, and the title shows job type, month and district.
- Open a seeded profile: the label reads "Not yet on WorkedWith. No reviews yet." and Email now works for anyone.

**Phase 11**
- Profile, Getting paid, Accounting software: tap Xero, Allow on the test page, pick the accounts, choose "Also send invoices already issued", Start syncing. The card shows how many were sent; invoices on job pages show Synced.
- Pay an invoice (simulated transfer): the payment syncs. Mark one paid by cash: it waits until the client confirms, then syncs.
- Send a quote to a client named "Fail Test" and get an invoice issued: it stays waiting; set its `first_attempt_at` more than 24 hours back and run the cron: it shows as failed with Retry now.
- Disconnect and connect FreeAgent instead.

**Phase 12**
- Admin, Seeded profiles: add a listing with an email and a Companies House number (with `COMPANIES_HOUSE_MODE=mock` and `SEEDED_OUTREACH_ENABLED=true`): the day 0 email is logged. Add one without a number: it says it won't be emailed.
- View the seeded page a few times and tap Email now, then set its `created_at` 31 days back and run the 03:00 cron (`/api/cron/expire-pending-invites`): the day 30 email includes the views and clicks.
- Set `created_at` 91 days back and run it again: the listing is removed.
- Claim a listing: after sign up you land on the trial welcome with the set up steps, and your business email is the listed email.

**Phase 13**
- Getting paid, Accept cards: Set up card payments (test mode returns straight away), Switch cards on, set the limit to £500.
- As the client on a due stage over £500: the card button offers up to £500 and says to pay the rest by bank. Pay with the test card: the stage shows part paid, the payment shows a Stripe fee in the payments export.
- As the trade, Refund by card on that payment: a credit note appears.
- To test a chargeback in mock mode, call `openChargeback` with the mock payment intent id (or insert a `chargebacks` row): the job shows the disputed panel; submit evidence. Set `outcome` to lost through `closeChargeback`: the stage is due again and the client's record shows a lost chargeback.

**Phase 14**
- As a client with a job, Account, Close my account: you are signed out, can't sign in again by text code, and the trade still sees the job and invoices with the name and address as quoted.
- As a trade with jobs, close the account: the bank and accounting connections are gone, the listing is hidden, and the client can still open their invoices with the bank details as issued.
- Set a paid job's `retain_until` in the past and run the cron: the quote shows "Removed" for the client, photos are deleted, amounts and invoice numbers remain.

**Phase 15**
- Sign in as a trade at 390px: the home shows the four figures, Needs you, the set up checklist and + New quote; the tab bar is at the bottom. At 1440px the links are in the top bar and the home is two columns.
- Let a trial get within 7 days of ending: the home shows the notice.
- Open a seeded claim link: the page explains the platform and the 30 day trial.
- Admin, Platform: every box loads.

<!-- tests -->

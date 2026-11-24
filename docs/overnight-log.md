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
| 2 Client accounts | Done (mock text codes) | Clients are found by mobile then email, or created with no password. Links in texts and emails open with a text code to the client's own mobile and sign them in. Person or company confirmed on first visit. Sign in later by text code or email link. Client area at /my with My jobs, Find a trade, My record |
| 3 Quotes | Done | Phone first quote builder (client, job, lines, saved items, copy a past quote, VAT, deposit with refund settings, on completion or stages by amount or percentage, planned start, photos, preview), drafts and versions, send by text and email, follow ups and expiry, unpaid deposit reminders at day 1, 3 and 6 with expiry at day 7 and extend, client quote page with accept (terms, cancellation notice, early start consent), ask for changes and decline, trade Jobs list with filters, trade job page, client My jobs and job page |
| 4 Start dates and job events | Done | Propose, confirm, counter and change planned starts from either side, materials ordered with an optional receipt photo, mark started (blocked inside a person client's 14 days without consent, with a request button), early start consent from the client's account, and a job history timeline on both job pages |
| 5 Stages and payments | Done (mock bank) | Mark done with photos, approve or raise an issue with photos, issue notes thread, resubmit, reminders at day 5, 10 and 14 plus a once a day manual reminder, request payment anyway after 14 days (always labelled not approved by the client), invoices with sequential numbers issued when a stage becomes due, bank details with copy buttons, "I've paid", automatic matching (exact, part payment, overpayment, probable match to confirm), daily bank sync, mark received, paid elsewhere with client confirmation, refunds with client confirmation, receipts, cancellation by either side with the deposit position, made to measure question, and a test mode "simulate a bank transfer" |
| 6 Invoices and exports | Done | Invoice pages for both sides (client page with copy buttons), invoice and credit note PDFs (HMRC VAT fields when VAT registered, PAID stamp, "requested by the trade" label), credit notes with their own sequential numbers issued for refunds, invoices and credit notes list on both job pages, and exports for any date range: invoices, payments (with Stripe fees) and credit notes as CSV, plus all invoices as one PDF |
| 7 Variations | Done | The trade adds a variation (addition or reduction, photos, note, the stage it goes on or a new stage) from the job page on a phone; it goes to the client by text and email; the client approves or declines with a note in their account; approved changes update the stage and job total for both sides and show on the invoice; withdraw while waiting |
| 8 Chasing, letters and claim pack | Done | Daily chasing on every due stage (2 days before, due date, 3, 7 and 14 days late) by text and email in the trade's name with the bank details and reference, a 21 day prompt to the trade, the review window at 30 days, overdue status, "I've paid" pause of 3 working days, pause, resume and stop per job, letter before action (person: 30 days with information sheet and reply form; company: 14 days with optional statutory interest and fixed compensation) previewed and sent with one tap, readable by the client, and a claim pack PDF with the Money Claim Online figures, terms, acceptance record, events, variations, stages with photos, issues, payments, reminders and all invoices |
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
9. Twilio Verify: confirm `TWILIO_VERIFY_SERVICE_SID` is set in production. Supabase Auth: allow the email magic link redirect `https://workedwith.co.uk/auth/callback`.
10. Accountant check of the invoice layout and the export columns (PRD 19 item 9).
11. Set `LATE_PAYMENT_REFERENCE_RATE` to the current Bank of England reference rate, and update it each January and July.
12. Solicitor review of both letters, the information sheet and reply form, and every chasing message (`src/lib/email/templates-v42.ts`, `src/lib/sms/copy-v42.ts`, `src/lib/pdf/lba-pdf.ts`).
<!-- needs -->

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

<!-- tests -->

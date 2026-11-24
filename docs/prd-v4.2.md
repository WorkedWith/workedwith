# WorkedWith PRD v4.2: Trust Built on Paid Jobs

Version 4.2, 24 November 2026. Replaces v4.1 in full. Changes from v4.1:
- **Mobile:** quotes and variations can be created and edited fully on a phone. Everything the client sees is designed for a phone first.
- **Approvals:** only from the client's own signed in account. Text reply approvals removed.
- **Stalled stages:** automatic reminders to the client at day 5, 10 and 14. Never approved by the trade.
- **Costs made plain:** £19.99 a month is the only cost from WorkedWith. Open banking is used only to see that a bank transfer has arrived and mark the invoice paid. The pay by bank button is removed.
- **Reviews work like Airbnb's:** 14 days to review once the job is done. Both publish together when both are in, or when the window closes. Photos on reviews.
- **Client records:** shown in full to any trade quoting the client or looking them up by email or mobile. Client share settings removed.
- **Public trade profiles:** show the business email with an "Email now" button. The request a quote form and seeded quote request emails are removed.
- **Trade set up order:** join, build the profile, bank details and open banking, accounting software, then quote.
- **Chasing:** unpaid deposits are now chased, and late payment notices are confirmed.
- **Build order:** the landing page is phase 0.5.
- **Directory role:** mainly for clients who have had a job done and want other trusted trades nearby.

v4.1 changes from v4.0 still apply: the new positioning, no backdated jobs, the review rules, seeded profile rules, accounting sync, one feature set plus Boosted Districts, and the cleanup phase.

Everything in v3.x that this document does not change stays as it is.

Design reference: the "WorkedWith Get Paid Screens" design canvas (trade and client journeys plus screens).

## 1. What WorkedWith is

WorkedWith is the UK directory of trades where **every review comes from a real, paid job**, and where **clients have a reputation too**.

It works because trades run their jobs through WorkedWith's quoting, invoicing and payment platform:
- the trade quotes and the client accepts;
- extras are approved before the work is done;
- the client pays by bank transfer and the invoice marks itself paid;
- late payments are chased automatically.

Every job that runs through the platform proves that the work happened and that money changed hands. Only then can either side review the other.

**The problems it solves**

| Who | Problem | How WorkedWith fixes it |
|---|---|---|
| Trades | Clients who pay late or not at all | Approved quotes and extras, bank transfer payments matched automatically, automatic chasing, a job report for disputes |
| Trades | Not knowing which clients are trouble | Client reviews and payment records from other trades |
| Clients | Rogue trades and fake reviews | Every review is tied to a paid job, so they can't be bought or invented |
| Clients | Not knowing who is good | A directory ranked on real, paid work |

**Why each side uses it**
- **Trades** join for the tool, because it gets them paid with less hassle. They stay because clients are held accountable and their reputation builds with every job.
- **Clients** use it because the trades worth using are on it and the reviews are real. It is always free for them.

**Lines to use**
- Tagline: **Know who you're working with.**
- For trades: **Every job agreed. Every job paid.** Quote, invoice and get paid in one place. Every job builds your reputation, and you'll know who pays before you quote.
- For clients: Every review comes from a real, paid job. Find trades you can trust, and be a client they want to work for.
- What we can always defend: "every review is tied to a paid job" and "the only one where clients are reviewed too". Never claim "the only directory with genuine reviews"; competitors check reviews in their own ways.

**What we are not:** a job management tool, a messaging app, a debt collector, a lender or a payment holder. Money goes straight from the client's bank to the trade's own bank account. WorkedWith never holds client funds.

**Where the work comes from:** around 90% of jobs will be trades bringing their own customers. The directory grows as a side effect of that work.

**What the directory is for:** it is not trying to be Google for trades. Its main audience is clients who have already had a job done through WorkedWith, liked how it worked, and come back to find other trusted trades in their area. Every job a trade runs brings a client onto WorkedWith, and that client then sees the other trades. Trades benefit too: the more jobs run through WorkedWith, the more clients have reviews, and the more useful client records become.

## 2. Product principles (key rules)

1. **Only paid jobs build reputation.** Reviews exist only for jobs run through WorkedWith, opened by payment, non payment or cancellation (section 13). There are no past or backdated jobs and no reviews without a job record.
2. **Every job is quoted.** No payment without an accepted quote. The invoice is always built from the quote plus approved variations.
3. **Only the client approves, from their own signed in account.** Quote acceptance, variations, start dates and stage approvals happen only there, so there is always a clear record of the client agreeing. No text reply approvals. Nothing can be approved on the trade's device or by the trade.
4. **Nothing is approved by default.** Every stage needs an active approval, and silence never counts as approval. Stalled stages get automatic reminders to the client at day 5, 10 and 14. A trade can then request payment on a stalled stage, but it is never shown as approved; it is always labelled as not approved by the client (section 9).
5. **Clients never pay WorkedWith.** Client accounts are always free.
6. **One plan for trades.** £19.99 a month after a 30 day free trial. The same features for every trade. The only extra is the optional Boosted Districts add-on (section 15), which buys placement, never features.
7. **Paid placement is always labelled.** Boosted trades show as "Boosted" wherever they appear. Boosting never changes reviews, scores or a trade's position in the normal results.
8. **£19.99 a month is the only cost from WorkedWith.** No transaction fees. WorkedWith pays its own open banking costs out of the subscription. The only other possible cost is Stripe's card fee, and only if the trade switches card payments on; Stripe charges it to the trade directly. Boosted Districts are an optional extra. WorkedWith never takes a cut of a payment.
9. **WorkedWith never holds money.** Bank payments go straight from the client's bank to the trade's own bank account. Optional card payments go to the trade's own Stripe account.
10. **Chasing is software, in the trade's name.** Reminders are sent automatically on the trade's behalf. WorkedWith does not collect debts or file claims.
11. **Client records are for trades only.** A trade quoting a client, or looking them up by email or mobile, sees the full record. Never public, never searchable by name (section 14).
12. **Reviews work like Airbnb's.** Both sides have 14 days once the job is done. Neither review shows until both are in or the 14 days end, then they publish together (section 13).
13. **One login per account.** One trade business, one login. One client, one login, marked as a person or a company. No organisations or team members.
14. **No general messaging.** Trades and clients talk on their own channels. Written notes exist only where they form part of the record: quote change requests, variations, stage issues and disputes.
15. **Clean, simple and fully mobile.** Desktop is first class, and every screen must also work properly on a phone. A trade on site can create or edit a quote and send a variation from their phone. Everything the client sees (quote, approvals, invoices, paying) is designed for a phone first, because it is opened from a text or email. If a feature doesn't help a trade get quoted, approved, paid or trusted, it waits.

**Existing rules that stay:**
- phone number as unique identifier, and deleted accounts' phone numbers stay blocked;
- ID verification rules;
- review anonymisation on account closure;
- reviews can't be edited once published or removed by their author, and disputes are the only route;
- public trade profile at /t/[slug] showing the business name only;
- trade phone numbers shown to signed in members only (the business email is public, section 15);
- no dashes or hyphens in user facing copy;
- RLS on every table;
- TypeScript with no any.

**Existing rules this replaces:**
- Free, Standard and Pro tiers, the photo ladder, and the 3 Boosted Districts included with Pro (boosts are now a separate add-on for any subscribed trade);
- client lookup and client profile detail decided by tier;
- backdated jobs as the cold start engine;
- the v3.x review flow triggered by a trade marking a job complete.

The Companies House fields on Organisation stay in the database untouched, but the organisation features are parked (section 23).

## 3. Pricing and what every trade gets

**One plan: £19.99 a month.** It covers one trade business with one login.

- **30 day free trial** starting at sign up or when a seeded listing is claimed. Full product during the trial. No card needed to start.
- **Card asked for before the trial ends.** Reminders at day 23, day 28 and day 30. The subscription is billed through Stripe Billing.
- **If the trial ends without subscribing:**
  - the trade can't send new quotes or variations;
  - the directory listing is hidden;
  - chasing stops;
  - automatic matching and accounting sync switch off.
  - **Clients can still pay** by bank transfer using the details on their invoices. The trade can still mark payments, download invoices and exports, and submit reviews already open.
- **Cancelling** works the same way as a lapsed trial, at the end of the paid period.
- **Boosted Districts add-on:** £10 a month per district, billed on the same Stripe subscription as an extra item (quantity = number of boosted districts). Available once the trade is on the paid plan, not during the free trial. Cancelling the plan, or the plan lapsing, ends all boosts.
- **Admin plan grants stay** (v3.8 item 6): admin can give a trade free access until a set date, used for any founding offer.
- **Monthly billing only.**

**What it costs a trade, in plain words** (use this on the pricing page):

| | Cost |
|---|---|
| WorkedWith | **£19.99 a month** after a 30 day free trial. Everything included. |
| Bank transfer payments from clients | **Free.** No transaction fees, ever. |
| Connecting your bank so invoices mark themselves paid | **Free.** WorkedWith pays for it. |
| Accounting software sync | **Free** (you need your own Xero, QuickBooks, FreeAgent or Sage account). |
| Card payments (optional, only if you switch them on) | Stripe's fee, charged by Stripe directly, currently 1.5% + 20p for standard UK cards. WorkedWith takes nothing. |
| Boosted Districts (optional) | £10 a month per district. |

**What every trade gets:**

| Feature | Every trade |
|---|---|
| Quotes, jobs, invoices, chasing | Unlimited |
| Bank transfer payments and automatic matching | Included, no transaction fees |
| Accounting sync | Optional: Xero, QuickBooks, FreeAgent or Sage (one connection) |
| Profile gallery | Up to 10 photos |
| Featured jobs | Up to 3 paid WorkedWith jobs on the profile, up to 5 photos each |
| Operating districts | Up to 20 postcode districts |
| Review responses | One 300 character response per review |
| Client records | Full record for any client they quote or look up (section 14) |
| Profile activity | Profile views and Email now clicks, last 30 and 90 days |
| Profile link and QR code | Included, for vans, cards and social media |
| Dispute handling | Same priority for everyone |
| Boosted Districts | Not included. Optional add-on at £10 a month per district (section 15) |

**VAT:** WorkedWith runs as a sole trader and is not VAT registered, so the full £19.99 is revenue.
- Registration is needed once taxable turnover passes £90,000 in any rolling 12 months. The price and VAT treatment are reviewed with the accountant at that point.
- Admin shows rolling 12 month subscription revenue so the threshold is visible.

**Running costs per trade** (estimates, for reference):
- Stripe's fee on the £19.99 subscription: roughly 65p.
- Text messages: roughly £2 to £3 a month for an active trade. Only action texts go by text; everything else goes by email.
- Open banking (account information only: reading incoming payments on the trade's connected account so invoices mark themselves paid): target under £1 a month per connected trade, to be confirmed by provider quotes (section 19). There is no payment initiation, so no per payment cost.
- Accounting APIs: Xero has charged app partners by tier since 2 March 2026, based on connections and data pulled. WorkedWith mostly pushes data, so it should sit in a low tier. Confirm before launch (section 19). QuickBooks, FreeAgent and Sage are expected to be free at our volumes; confirm.
- Optional card payments: no cost to WorkedWith (Stripe handles pricing and charges the trade). Stripe's standard UK card fee is currently 1.5% + 20p; check before quoting it on the site.

## 4. Trade journey

Each set up step after joining can be skipped and finished later, except bank details, which are needed before the first quote. A progress checklist on the trade's home shows what's left.

1. **Join or claim.** Sign up, or claim a seeded listing. Phone verified by text code. The ID check stays optional but shows as "ID checked" in the directory.
2. **Build your profile.**
   - business name, trading address, trades, operating districts;
   - business email (shown publicly with the Email now button) and phone (members only);
   - logo, gallery photos (featured jobs come later, from paid jobs);
   - VAT number if registered;
   - standard terms (WorkedWith default terms pre filled);
   - reply email for client replies, defaulting to the business email.
3. **Bank details and open banking.**
   - **Bank details (required before the first quote):** the account name, sort code and account number clients should pay. Checked with Confirmation of Payee through the open banking provider where available, so the name matches.
   - **Connect your bank (optional, recommended):** the trade connects that same account through open banking. They pick the bank and approve in the banking app, which takes about a minute.
     - This lets WorkedWith see incoming bank transfers and mark invoices paid automatically.
     - It reads incoming payments only and can never move money.
     - If the bank isn't supported or the trade prefers not to connect, everything still works: the trade marks payments as received.
4. **Connect accounting software (optional).** Xero, QuickBooks, FreeAgent or Sage (section 12). Can be done any time from Profile.
   - **Accept cards (optional, any time from Profile):** connect Stripe, set up so Stripe handles pricing. The trade gets their own Stripe account, and Stripe charges its card fees to them directly. Never use the "platform handles pricing" setup.
5. **Quote.** Build and send, on desktop or phone (section 6). The trade sees the client's record next to the quote (section 14).
6. **Job booked.** The job is booked when the client accepts, or when the deposit is paid if the trade asked for one. The start date is set on the quote or agreed later (section 7).
7. **Job runs.**
   - The trade marks materials ordered if relevant, marks the job started, marks stages done with photos, and adds variations as needed.
   - The client approves and pays.
8. **Paid or chased.** Payments are matched automatically and stages show paid. Unpaid due stages are chased automatically (section 10). Invoices and payments sync to the trade's accounting software.
9. **Review.** The review window opens for both sides (section 13).

## 5. Client journey

1. **Get a quote.** The trade sends a quote to the client's mobile (text) and email. Clients who find a trade in the directory contact them by email first, and the trade then sends the quote through WorkedWith.
2. **Open the account.** The first link creates the client account. Mobile verified by text code. No password; later visits use a text code or an email magic link.
3. **Accept.**
   - Read the price, how payment works, the deposit and whether it's refundable, the planned start, the terms and the cancellation notice.
   - Accept from their own account. Pay the deposit if the trade asked for one.
4. **Agree a start date** if it wasn't set on the quote (section 7).
5. **Track the job.** One page per job showing:
   - start date and stages;
   - what has been done, with the trade's photos;
   - what has been paid and what is due next;
   - invoices and receipts.
6. **Approve variations** before the extra work happens.
7. **Approve stages** when the trade marks them done, or raise an issue.
8. **Pay** each due stage, in full or in parts, by:
   - bank transfer, using the trade's details and the reference on the invoice. Each detail has a copy button, so it's easy to paste into a banking app on the same phone;
   - card, if the trade accepts cards.
9. **Review** the trade when the window opens. Their own record updates.
10. **See their own record**, including reviews from trades (section 14).

### Designed for the phone

The client opens every link from a text or email, so the client side is built for a phone first: one clear action per screen, large buttons, the price and what they are agreeing to at the top, and no app to download. Approving always means signing in to their own account with a text code, so every approval is on record as theirs.

### Person or company

Every client account is marked as a **person** or a **company**.
- The trade picks it when creating the quote (default: person). The client confirms or corrects it when they open the account.
- **Company** clients add a company name and, optionally, a Companies House number. The account is still one named contact with their own verified mobile, and that contact makes every approval.
- The type is saved on the quote at the moment of acceptance and doesn't change for that job afterwards.

What the type changes:

| | Person | Company |
|---|---|---|
| Cancellation notice and "start within 14 days" consent | Shown and required | Not shown |
| Non refundable deposit | Only once a set point is reached, and subject to the cancellation period (section 6) | As the trade sets it |
| Late payment interest and fixed compensation | Not available | Trade can add it to the letter before action |
| Letter before action response period | 30 days (Pre Action Protocol for Debt Claims) | 14 days |
| Name on quotes, invoices, claim pack and accounting sync | The person's name | The company name, with the contact's name |

A landlord or business owner acting through a limited company should be set up as a company. Someone acting in their own name, including a sole trader, is set up as a person. Person is the safe default because it gives the fuller protections.

## 6. Quotes

**Building a quote (trade)**
- **Client:** type (person or company), name (and company name if a company), mobile, email and job address. If the mobile matches an existing client account, the job attaches to it.
- **Job:** title and description.
- **Line items:** description and price.
  - Saved items library, for example "Boiler service £85".
  - Copy a previous quote.
- **VAT:** a toggle, available only if the trade has a VAT number. Totals shown with and without VAT.
- **Validity:** defaults to 30 days.
- **Planned start:** a date, as soon as possible, or to be agreed (section 7).
- **Deposit:** see below.
- **When you get paid:** one of
  - **on completion:** the balance is one final stage;
  - **in stages:** any number of named stages, by amount or percentage.
  - Deposit plus stages must add up to the quote total before the quote can be sent.
- **Terms:** WorkedWith standard terms are attached automatically, plus the statutory cancellation notice for person clients. The trade can add their own extra terms.
- **Target:** a simple quote sent in under 60 seconds, on a phone as easily as on a desktop. The default quote (no deposit, paid on completion, start to be agreed) needs only the client, the job and the price.
- **On a phone:** the whole builder works one handed on a phone: add or edit lines, change prices, add photos from the camera, preview and send. The same goes for editing a sent quote and adding a variation on site.

**Deposit**
- One tick box, **"Take a deposit to book this job in"**, unticked by default. When it's unticked, the job is booked as soon as the client accepts.
- When it's ticked, the trade sets:
  - **Amount:** a sum or a percentage.
  - **What it covers:** materials, labour, or materials and labour.
  - **Refundable or non refundable:** defaults to refundable.
- **If non refundable, the trade picks the point it becomes non refundable:**
  - **once materials are ordered** (the default when the deposit covers materials), or
  - **once work starts** (the default when it covers labour only).
  - For company clients there's also **non refundable from payment**.
- Before that point the deposit is refundable. A non refundable deposit only holds up where it reflects real costs the trade has taken on.
- **What the client sees,** in plain words on the quote and receipt, for example "Deposit for materials: £800. Non refundable once materials are ordered." or "Deposit: £300. Refundable."
- **Person clients and the cancellation period:**
  - If the client cancels within the 14 day cancellation period, the deposit is refundable whatever the setting.
  - The exception is materials that are made to measure or made to order, once ordered.
  - The trade sees a short note explaining this when they pick non refundable for a person client.
  - Exact wording is part of the solicitor review (section 19).
- The job is booked once the deposit is paid. **Unpaid deposits are chased,** so the work can be booked in: reminders to the client at day 1, day 3 and day 6 after acceptance, in the trade's name. If it's still unpaid at day 7, the quote expires and both sides are told. The trade can extend the deadline by 7 days at a time.

**Sending:** by text and email. The client gets a link to the quote in their account, which opens straight to the quote on their phone after a text code.

**Statuses:** draft, sent, viewed, accepted, changes requested, declined, expired, withdrawn.

**Quote follow ups** (automatic, can be switched off per quote):
- Viewed but not accepted: a nudge to the client at day 3 and day 7.
- Never opened: a reminder at day 3.
- Expiring: a reminder 3 days before the quote expires.
- The trade is told when a quote is viewed, accepted, declined or expires.

**Changing a sent quote:** the trade edits and resends. It becomes a new version and the client must accept again. Previous versions are kept and visible to both sides.

**Accepting (client):**
- Ticks to confirm they have read the terms (and, for person clients, the cancellation notice).
- For person clients, gives the "start within 14 days" consent where needed (section 7).
- Pays the deposit if the trade asked for one, with the refund position shown right next to the pay button.
- Or **asks for changes** with a short note, for example "Can you price it without the vanity unit?" The trade revises and sends a new version.
- Or declines, with an optional reason.

Declined and expired quotes never open a review (section 13).

## 7. Start dates and job events

Start dates are planned, not guaranteed. Copy always says "planned start".

**On the quote,** the trade picks one of:
- **A date:** shown to the client as the planned start.
- **As soon as possible.**
- **To be agreed:** shown as "start date to be agreed".

**Agreeing or changing a date after acceptance**
- The trade proposes a date from the job page. The client confirms it in their account, or suggests another date for the trade to accept.
- Changing an agreed date works the same way: proposed by one side, confirmed by the other.
- A booked job with no agreed date after 14 days shows on the trade's home as "needs a start date". Nothing is sent to the client automatically.

**Marking materials ordered**
- When the deposit covers materials, the job page has a **"Materials ordered"** button. The trade can add a photo of the order or receipt.
- The client is told straight away ("Your materials have been ordered"), and the date is recorded.
- If the deposit was set as non refundable once materials are ordered, this is the moment it becomes non refundable, subject to the cancellation period for person clients.

**Marking the job started**
- The trade marks the job **started** when work begins.
- This records the actual start date and moves the job to in progress.
- It is the point a "non refundable once work starts" deposit becomes non refundable, and the point from which a cancellation opens reviews (section 13).

**The cancellation period (person clients only)**

A person client has 14 days from accepting to cancel. If work starts in that time, the trade needs the client's request to start early, or they may not be able to charge for work done. The consent is asked at the point it's needed:
- **At acceptance,** if the planned start is as soon as possible or a date within the 14 days.
- **When confirming a start date,** if a date agreed later falls within the 14 days. The consent is part of the client's confirmation.
- **Never,** if the start falls after the 14 days.

The trade can't mark a job started inside the cancellation period without that consent. The button explains why and offers to send the client the request.

## 8. Variations

- The trade adds a variation to an active job: description, price (an addition or a reduction), optional photos and a note.
- It's sent to the client by text and email to approve in their account **before the work is done.**
- The trade can create and send a variation entirely from their phone while on site, including photos taken there and then.
- The client can approve, or decline with an optional note.
- Statuses: sent, approved, declined, withdrawn.
- **Approved** variations are added to a stage the trade picks, usually the next one or the final one. **Declined** variations go nowhere.
- The job total and remaining balance update for both sides.
- The trade can't change an approved variation; they add a new one instead.

## 9. Stages and payments

**Stage statuses:** upcoming, awaiting approval, issue raised, approved (due), requested by trade (due), part paid, paid, overdue.

- **Deposit stage:** only when the trade asked for a deposit. It's due on acceptance with no separate approval, because accepting the quote is the approval.
- **Other stages:** the trade marks them done with at least one photo and an optional note. The client gets a text and email to review.
- **Client options:** approve, or raise an issue with a reason and optional photos.
  - The trade replies on the issue, then either fixes the problem and resubmits the stage, or agrees a change through a variation.
  - The issue notes are the only back and forth on the platform for that stage.
- **No response:** automatic reminders to the client to approve at **day 5, day 10 and day 14**, sent in the trade's name. The trade can also send a reminder themselves at any time (at most once a day). The trade sees "awaiting approval" and how long it has been waiting. A stage is never approved automatically, and never approved by the trade.
- **Payment due:** an approved stage is due within the trade's payment terms (default 7 days, adjustable from 0 to 30).

**Request payment anyway (stalled stages)**

This stops a client blocking payment forever by not responding or keeping an issue open.
- **When it's available:** after a stage has been **awaiting approval for 14 days** (after the day 14 reminder), or an **issue has been open for 14 days** since the trade last responded or resubmitted. The trade can then tap **"Request payment anyway"**.
- **What happens:**
  - The trade must confirm the work is complete and add a short note.
  - The stage becomes **"requested by trade (due)"**, due within the trade's payment terms, and chasing starts.
- **How it's labelled:**
  - It is **never shown as approved by the client.**
  - Both sides, the invoice, the letter before action and the claim pack all say "Payment requested by the trade. Not approved by the client", with the timeline of what happened.
  - The client can still approve at any point, which changes the label to approved, or keep the issue open, which stays visible on the record.
- **Effect on the client's record:** these stages are excluded from the client's "paid on time" figure until paid. A stage paid only after a request is counted separately from one the client approved.

**How clients pay (bank transfer first)**
- **Bank transfer:** every invoice shows the trade's account name, sort code, account number and the reference (the invoice number). On a phone, each has a copy button so the client can paste them into their banking app. Money goes straight from the client's account to the trade's account, with no fee to anyone.
- **"I've paid":** after paying by transfer, the client can tap "I've paid". This pauses chasing for up to 3 working days while the money arrives and tells the trade. It doesn't mark the invoice paid; only a matched payment or the trade does that.
- **No pay by bank button at launch.** WorkedWith doesn't start payments, it only reads incoming ones. A pay by bank button (open banking payment initiation) could be added later if clients struggle with typing details or references.
- **Card, Apple Pay, Google Pay (optional):**
  - Only if the trade has switched on cards. Charged on the trade's own Stripe account, with Stripe's fee taken off the trade's payment.
  - The trade can set a **card limit per payment** (default £1,000). Above it, the client is shown bank payment only.
  - UK rules don't allow card surcharges to consumers, so the price is the same whichever way the client pays.
- **Part payments:** the client can pay any amount of £10 or more towards a due stage, by any method. The balance stays due and chasing continues on the balance only. The trade can switch part payments off.

**Automatic matching (open banking account information)**
- Works when the trade has connected their bank (section 4).
- WorkedWith reads **incoming payments only** on the connected account, checking regularly and on provider notifications where offered.
- **Exact match** (reference matches an invoice, amount equals the balance): the stage is marked paid, chasing stops, a receipt goes to the client, and the payment syncs to accounting.
- **Reference matches, different amount:** recorded as a part payment, or flagged to the trade as an overpayment.
- **Probable match** (no reference or the wrong one, but the amount and payer name fit an open invoice):
  - The trade gets a prompt to confirm, for example "£1,200 from S MILLER. Is this invoice BLC 0014?"
  - Nothing is marked paid until the trade confirms.
- **No match:** ignored and not stored.
- **Staying connected:** the trade is prompted to reconfirm the connection every 90 days with one tap. If it lapses, matching pauses and the trade is told; manual marking still works.

**Paid elsewhere**
- If the client pays another way (cash, cheque, a different account), the trade marks the stage **paid elsewhere** with the amount, date and method.
- The client is asked to confirm in their account. If the client says they didn't pay that way, it's flagged to both.
- These payments count towards the client's record only once the client confirms them. Automatically matched payments count straight away.

**Refunds**
- **Bank payments:**
  - The trade sends the refund from their own bank, then marks it refunded in the app with the amount and date.
  - The connected bank is read for incoming payments only, so the outgoing refund isn't seen. The client is asked to confirm receipt.
  - A credit note is issued (section 11).
- **Card payments:** refunded through Stripe from the job page. A credit note is issued.

**Receipts:** every payment sends a receipt to the client and a notification to the trade. Deposit receipts repeat the refund position.

**Card chargebacks (only for trades who accept cards)**
- If a client disputes a card payment with their bank, Stripe opens a dispute on the trade's Stripe account. The trade is told straight away by text and email.
- WorkedWith builds the evidence automatically from the job record and shows it to the trade:
  - accepted quote, terms and acceptance record;
  - variations;
  - stage approvals or the request payment anyway record;
  - photos, invoices and the reminders sent.
- The trade reviews it, can add their own notes or files, and submits it to Stripe with one tap before Stripe's deadline. A reminder is sent 3 days before the deadline.
- The outcome is recorded on the job. A lost chargeback marks the stage unpaid again and adds to the client's record as a dispute.
- Bank payments have no chargebacks.

**Job statuses:**
- **quoted;**
- **booked:** accepted, and deposit paid if one was asked for;
- **in progress:** marked started;
- **completed:** all stages approved or requested;
- **paid:** everything paid;
- **cancelled;**
- **disputed.**

**Cancellation:**
- Either side can cancel a booked or active job, with a reason.
- Any due but unpaid amounts stay due and chasing continues. Unstarted stages are cancelled.
- Cancellation is shown in both histories. If the job had been marked started, it opens the review window (section 13).

**Deposit on cancellation:** the app works out where the deposit stands and shows it to both sides.
- **Refundable, or the non refundable point hasn't been reached:** the trade is prompted to refund it. Until it's marked refunded and the client confirms, the job shows "deposit refund due" on both sides.
- **Non refundable point reached** (materials ordered, work started, or from payment for a company): the trade can keep it. The record shows when and why it became non refundable.
- **Person client cancelling within the cancellation period:** a refund is due, unless the materials ordered were made to measure or made to order. The trade confirms which applies, and it's recorded.
- Either side can raise a dispute over a deposit through the existing dispute route.

**No instalment plans or finance.** Part payments cover "paying in chunks" without making the trade a lender.

## 10. Automated chasing

**How it runs**
- It runs on each due stage (approved, or requested by the trade) that isn't fully paid.
- All messages go by text and email, worded as coming from the trade's business, with "sent via WorkedWith" in the footer.
- Every message includes a link to the invoice, and the bank details with the reference.
- Email replies go to the trade's reply email, never to WorkedWith.

| When | Message |
|---|---|
| Due date minus 2 days | Friendly heads up with the invoice link |
| Due date | Payment due today |
| 3 days overdue | Late payment notice |
| 7 days overdue | Second late payment notice |
| 14 days overdue | Final notice: pay within 7 days or the trade may start formal recovery |
| 21 days overdue | The trade is prompted to send a letter before action |
| 30 days overdue | The review window opens for both sides (section 13) |

- **When chasing stops:** the moment a payment is matched or marked received by the trade. A client's "I've paid" pauses chasing for up to 3 working days while the money arrives.
- **Letter before action:** generated from the job record, previewed by the trade and sent by them with one tap (email plus a downloadable PDF to post).
  - **Person clients:** follows the Pre Action Protocol for Debt Claims. Allows 30 days to respond and includes the protocol's information sheet and reply form.
  - **Company clients:** allows 14 days. The trade can add statutory late payment interest and fixed compensation under the Late Payment of Commercial Debts (Interest) Act.
- **Claim pack (the job report):** a downloadable PDF, available only once the letter before action response period has passed. It contains:
  - the accepted quote and terms, the acceptance record and the deposit terms;
  - the materials ordered record, the start date confirmation and any early start consent;
  - approved variations;
  - stage approvals or request payment anyway records, and issue notes;
  - photos, invoices, payments and every reminder sent;
  - the figures in the format Money Claim Online asks for.

  The trade files the claim themselves. WorkedWith does not file claims or act for anyone.
- **Controls for the trade:** pause chasing on a job, or stop it. Chasing pauses automatically if the client raises an issue on that stage, until the trade resubmits or requests payment anyway.
- **Copy rules:** firm but accurate. Never threaten anything the trade can't or won't do. All chasing copy is reviewed alongside the terms (section 19).

Unpaid deposits are chased separately: day 1, 3 and 6 after acceptance, then the quote expires at day 7 unless the trade extends it (section 6). Deposits are never taken to a letter before action, because no work has been done.

## 11. Invoices and records

**Invoices**
- An invoice is issued automatically when a stage becomes due: approved, requested by the trade, or the deposit on acceptance. Deposit invoices are marked as deposits.
- Each invoice shows:
  - the trade's business name, trading address and logo, and VAT number if registered;
  - a **sequential invoice number** per trade business, with a prefix set by the trade (for example "BLC 0001"). It is also the payment reference;
  - issue date and due date;
  - the client's name (company name for company clients) and the job address;
  - what it's for: the stage name, including any approved variations;
  - amounts, with the VAT breakdown if registered;
  - amount paid so far and balance due;
  - the trade's bank details with the reference, and a link to view the invoice online (and pay by card if the trade accepts cards).
- Invoices are PDFs both sides can download. Paid invoices are marked paid with the payment date and method.
- **Credit notes** are issued for refunds and for reductions after an invoice has been issued. Invoices are never edited once issued.
- Invoices for VAT registered trades meet HMRC VAT invoice rules. The layout gets a final check with the accountant (section 19).

**Exports for the accountant**
- From Profile, the trade can download a CSV for any date range:
  - invoices: number, date, client, net, VAT, total, status;
  - payments: date, invoice, amount, method, and Stripe card fees where relevant;
  - credit notes.
- Also a single PDF bundle of all invoices for the period.
- Exports stay available after the trial lapses or the plan is cancelled. This covers any accounting software not synced directly.

**Record retention**
- Quotes, acceptances, variations, approvals, invoices, credit notes, payments and chasing records are kept for **6 years** after the job is paid or cancelled, for the trade's tax and legal records.
- **If a client closes their account:**
  - Their login is removed, and their personal details are removed from everything except the jobs they were part of.
  - On those jobs, the trade keeps the invoices and job record with the client's name and job address, as the trade is legally required to keep them.
  - Reviews follow the existing anonymisation rule.
  - The client's record settings are deleted.
- **If a trade closes their account:**
  - The client keeps access to their own invoices, receipts and job history.
  - The bank connection and accounting connections are revoked. The trade's bank details are deleted, except where they appear on issued invoices.
- After 6 years, financial records are deleted or fully anonymised by a scheduled job.

**Bank data**
- Bank account numbers are stored encrypted.
- From the bank connection, WorkedWith stores only payments matched (or suggested) to an invoice: date, amount, payer name and reference. Nothing else from the trade's account is stored or shown.

## 12. Accounting integrations (new)

**Optional for every trade.** Nothing in WorkedWith depends on it; a trade who never connects accounting software loses nothing but the sync, and can always use the CSV export.

**At launch:** Xero, QuickBooks Online, FreeAgent and Sage Accounting. Each is built directly against the platform's own API; no unified API provider, because their per connection pricing doesn't work on a £19.99 plan. The CSV export covers everything else.

**Connecting**
- From Profile, under Getting paid. The trade picks their software and signs in through it to approve. One accounting connection per trade.
- **At connection, the trade confirms:**
  - the sales account invoices go to (a sensible default is pre selected);
  - the bank account payments are recorded against;
  - VAT rate mapping (only if VAT registered);
  - whether to sync from today, or also send invoices already issued on WorkedWith.

**What syncs (one way, WorkedWith to accounting software)**

| WorkedWith event | Sent to accounting software |
|---|---|
| Invoice issued | Contact (created or matched by name and email), then the invoice with lines, VAT and due date, numbered with the WorkedWith invoice number |
| Payment received or marked paid elsewhere (and confirmed) | Payment against that invoice, dated when paid, to the chosen bank account |
| Card payment with a Stripe fee | Payment, plus the fee as a bank charge where the platform supports it; otherwise shown in the export |
| Credit note | Credit note against the invoice |
| Refund | Refund against the credit note where supported |

**Rules**
- WorkedWith never reads or changes anything else in the trade's accounts, and never deletes anything there.
- Invoices are never edited after issue, so updates are always new records (payments, credit notes).
- **Failed syncs:**
  - retried automatically for 24 hours;
  - then shown on the trade's home under "Needs you", with the reason and a retry button;
  - a sync failure never blocks the job or the payment.
- If the connection expires, the trade is told and sync pauses. Anything missed is sent once they reconnect.
- A lapsed trial or cancelled plan pauses sync. Exports still work.
- **Matching the trade's bank feed:** the trade's own bank feed in their accounting software will also show the payment. Recording the payment against the invoice lets them reconcile it in one click. Copy should explain this so trades don't record it twice.

**Build approach:** one internal interface (connect, refresh connection, upsert contact, create invoice, record payment, create credit note, record refund, disconnect) with a separate adapter for each platform. The same pattern as open banking, so a fifth platform can be added later without touching the rest of the app.

## 13. Reviews (new)

Reviews are the reason the directory can be trusted, so they only ever come from a WorkedWith job.

**When the review window opens** (for both sides at once):
1. **Job paid:** the final stage is paid.
2. **Non payment:** any due stage is 30 days overdue. This means a client who doesn't pay can still be reviewed, and can't block it by staying silent.
3. **Cancelled after work started:** either side cancels a job that was marked started.

It never opens for quotes that were declined, withdrawn or expired, or for jobs cancelled before they started.

**How it works (the same as Airbnb's)**
- **Window:** both sides have **14 days** from when the window opens. Reminders at day 3 and day 10 to anyone who hasn't reviewed.
- **Hidden until both are in:** neither side sees the other's review until both have submitted, or the 14 days end, whichever comes first. This stops either side changing their review in reaction to the other's.
- **Both submitted:** both publish straight away, together.
- **Only one submitted when the window closes:** that review publishes on its own. The side being reviewed can't stop it by never reviewing.
- **Neither submitted:** no reviews for that job.
- **Editing:** the author can edit their review until the other side submits or the window closes. Once published, it's locked.
- One pair of reviews per job. The existing review dimensions, ratings and score calculations stay.
- **Photos:** each review can include up to 5 photos, from either side (for example the finished work, or the state the job was left in). They go through the existing photo moderation, and never show the client's address.
- **Each review is labelled:**
  - **"Paid job"** when it came from a paid job;
  - **"Unpaid"** when the window opened on non payment and the job still isn't paid;
  - **"Ended early"** when the job was cancelled after starting.

  The label updates if an unpaid job is later paid.
- **Responses:** the reviewed person can post one 300 character response, permanently. The UI always offers the dispute route alongside.
- **Disputes:** the existing dispute route and admin queue stay. The admin sees the full job record (quote, approvals, photos, payments, chasing), which makes most disputes quick to settle.
- Reviews can't be removed by their author.

**Where reviews show**
- **Trade reviews:** public, on the trade profile (/t/[slug]) and in the directory. Anyone can read them.
- **Client reviews:** never public. Only on the client's record, seen by trades as set out in section 14.

## 14. Client record

Built automatically from jobs on WorkedWith:
- **Payment figures:**
  - jobs completed and jobs fully paid;
  - stages paid on time (paid by the due date) and average days to pay;
  - stages paid only after a request by the trade;
  - disputes and lost chargebacks.
- **Reviews from trades:** rating, review text and labels (section 13).
- **red_flag_count** (existing field, unchanged).
- Payments marked paid elsewhere count only once the client confirms them.

**Who sees it** (legal check needed, section 19):

| Who | What they see |
|---|---|
| A trade quoting the client (while the quote or job is open, and for 12 months after) | The full record: payment figures, reviews from trades with text and photos, labels and red_flag_count |
| A trade who looks the client up by email address or mobile number | The full record, the same as above |
| The client | Their own full record |
| Anyone else, including other clients and logged out visitors | Nothing. Client records are never public and never searchable by name |

There are no client sharing settings or share links. The record exists to protect trades, and it only shows what happened on real WorkedWith jobs.

**What the trade sees:** a "Good payer" summary at the top (for example "8 jobs, all paid on time"), then the figures and the reviews. They never see the private detail of other trades' jobs, such as prices or addresses.

**Lookup:** the existing client lookup by email or mobile stays the same for every trade, and needs the exact email address or mobile number. The search audit log and the 20 per 24 hours rate limit stay. Lookup by username is removed, so a record can't be found without already knowing how to contact the client.

## 15. Directory and trade profiles

**Who is listed**
- Every trade with an active trial or subscription is listed. Lapsed trades are hidden.
- Seeded trades are listed as set out in section 16.

**Search and ranking**
- Search by trade and postcode district (existing Find and districts).
- **Results order:**
  1. **Boosted band:** trades boosting that district for that trade, labelled "Boosted", in random rotation on each search (no seniority, as now).
  2. **Everyone else** by the v3.9 confidence weighted score. Boosted trades also keep their normal place here.
  3. **Seeded listings** last, never boosted.
- Trades using WorkedWith always rank above seeded listings.
- Existing rule stays: seeded listings only appear in Find where fewer than 3 real trades match.

**Trade card and profile show:**
- business name, trades and districts;
- ID checked, and Insured (v3.9);
- **paid jobs on WorkedWith** and **member since**;
- reviews and rating, and hired again by X clients (v3.9);
- gallery and featured jobs (section 3).

**Boosted Districts (paid add-on)**
- Any trade on the paid plan can boost any of their operating districts for £10 a month per district.
- Boosting puts the trade in the labelled boosted band at the top of Find results for that district, for the trades on their profile.
- **Up to 3 boosted trades per trade type per district** (proposed). When a slot is full, the trade can join a waiting list and is told when one frees up.
- Changes are free and unlimited, with the swap log as the safeguard (existing decision). A boost runs per billing month; removing one ends it at the end of the period.
- Boosting is shown in directory copy as "Boosted", with a short explanation on tap ("This trade pays to appear here. Reviews and scores are never affected.").
- **When to switch on:** boosts are only worth paying for once clients use Find in that district. Admin can switch boosts on per district (proposed: once the district has steady client searches in admin analytics), so trades never pay for placement nobody sees.
- Reuses the existing Boosted Districts build, moved from "3 included with Pro plus £10 add-on" to "£10 per district for any subscribed trade".

**Featured jobs**
- Chosen from the trade's own paid WorkedWith jobs, using that job's stage photos or new ones.
- Shown with the job type and month only. Never the client's name or the full address; at most the postcode district.

**What the public profile shows:** business name, trades and districts, reviews (with photos), the trust signals above, gallery and featured jobs, and the **business email**.

**Email now button:**
- Every member profile (and seeded profile) has an **Email now** button that opens the email app on the visitor's device, addressed to the business email, with the subject "Quote request via WorkedWith" and a short starter line in the body.
- The email address is also shown as text so it can be copied.
- To limit scraping, the address is put together in the browser rather than sitting in the page source, and the button is rate limited per visitor.
- Clicks are counted for the trade's profile activity (and in seeded claim emails).
- The trade then replies and sends their quote through WorkedWith, which brings the client onto the platform.
- The trade's phone number stays visible to signed in members only.

**Profile link and QR code** (v3.8 item 2 job link, changed) point to the trade's public profile, for vans, cards and social media. The "Log a job" button on profiles is removed.

**Launch area:** the directory is promoted to clients only in districts with enough trades. To start, that's WA14 and WA15. Trade marketing is UK wide.

## 16. Seeded trades

Builds on the existing seeded directory. Seeding fills areas so the directory is useful to clients from day one, and gives trades a reason to claim.

**What a seeded profile shows** (honest, from public information only):
- business name, trades and area;
- Companies House status and "Trading since" (incorporation year), where it's a limited company;
- the publicly listed email (existing rule; phone numbers are never seeded);
- a clear label: **"Not yet on WorkedWith. No reviews yet."**
- **Email now:** to the publicly listed email, as on member profiles.

It never shows reviews, ratings, paid job figures or anything suggesting the trade uses WorkedWith.

**Life of a seeded listing:** 90 days. Reminder points at day 30, day 60 and day 80, then removal. One click removal and the do not reseed list stay.

**Claiming:**
- Claiming a listing starts the 30 day free trial and takes the trade straight into setting up getting paid.
- **The claim page sells the platform:** quotes, approvals, getting paid with no transaction fees on bank payments, no chasing, and a reputation built from real jobs.

**Claim emails** (limited companies only):
- **Seeding email:** the first email, as now, with a clear opt out.
- **Reminder emails at day 30, 60 and 80** include the profile's activity where there is some, for example "4 people near you viewed your profile this month and 2 clicked to email you."
- Every email includes a clear opt out, which also adds them to the do not reseed list.

**Outreach rules (PECR):**
- Outreach goes only to limited companies, checked active on Companies House. Seeded listings need a Companies House number to qualify for outreach.
- Sole traders and partnerships are never emailed or texted, because PECR treats them as individuals and needs their prior consent. They can still be listed, and can claim if they find their listing.
- SEEDED_OUTREACH_ENABLED stays as the master switch.

**Multiple trades:** a seeded listing can carry several trades (for example a handyman listed for decorating, fencing, joinery and plastering). The "fewer than 3 real trades" rule is checked for each trade and district separately: if plastering in WA14 has 3 real trades, the listing drops out of plastering results there but still shows for decorating, fencing and joinery in WA14 where those have fewer than 3. This is how the current search already works.

**Seeding approach:** depth in the launch area first, so each main trade in each launch district has real choice, before spreading wider.

## 17. Notifications

Email via Resend, text via Twilio. Emails sent on a trade's behalf use the trade's reply email as the reply to address.

**To clients:**
- **Quotes:** quote received, quote updated, quote follow ups, deposit due and deposit reminders.
- **Job events:** materials ordered, start date proposed or changed, early start consent requested.
- **Approvals:** variation to approve, stage to approve (plus reminders at day 5, 10 and 14), payment requested by the trade.
- **Payments:** invoice issued, payment due and chasing messages, payment received (receipt), confirm a payment marked paid elsewhere, confirm a refund received, credit note.
- **End of job:** job complete, review window open (plus reminders), review published.

**To trades:**
- **Quotes:** quote viewed, accepted, changes requested, declined or expired, deposit paid, quote expired (deposit unpaid).
- **Job events:** start date confirmed or a different date suggested, early start consent given, variation approved or declined.
- **Stages:** stage approved or issue raised, stage can now be requested (14 days stalled).
- **Payments:** payment received, part payment received, probable match to confirm, overpayment, payment overdue.
- **Connections:** bank connection needs reconfirming or has lapsed, accounting sync failed or connection expired.
- **Card trades:** chargeback opened, and the evidence deadline.
- **Cancellations and disputes:** job cancelled and deposit refund due, letter before action ready.
- **Reviews:** review window open (plus reminders), review published, review response or dispute.
- **Account:** trial and billing reminders.

Texts are kept to messages that need action, to control cost. Trades can't switch off client messages that are part of the payment flow.

## 18. Screens

Desktop is first class: full width layouts with a top navigation bar on desktop, collapsing to a bottom tab bar on mobile. Every screen must work at 390px wide and at 1440px.

- **Trade screens on a phone:** the quote builder, editing a sent quote, adding a variation, marking a stage done with photos and marking payments must all be fully usable on a phone, not just viewable.
- **Client screens:** designed for a phone first and checked at 390px before desktop. Every client journey starts from a text or email link.

**Trade (navigation: Home, Jobs, Profile)**
- **Home:**
  - figures: owed to you, overdue, awaiting client approval, paid this month;
  - a "needs you" list: probable matches to confirm, jobs that need a start date, stages that can be requested, bank connection reconfirmation, accounting sync failures, chargebacks, deposit refunds due, reviews to write;
  - a set up checklist until set up is finished (profile, bank details, open banking, accounting);
  - one primary "New quote" button.
- **Jobs:** one list of quotes and jobs with filters (quotes, booked, in progress, awaiting payment, paid). Each row shows the planned start and the next thing that needs to happen.
- **Quote builder:** as in section 6, with a live preview of what the client will see.
- **Job page:**
  - start date (propose or change), materials ordered, mark started;
  - stages with status, mark done with photos, issues, request payment anyway;
  - variations;
  - payments (matched, sent, paid elsewhere) and the deposit position;
  - invoices and credit notes, with sync status;
  - chasing status;
  - downloads (letter before action, claim pack);
  - the review once open.
- **Profile:**
  - business details, trades, districts;
  - photos and featured jobs;
  - terms, saved items, invoice prefix, reply email;
  - default deposit settings and payment terms;
  - **Getting paid:** bank details, bank connection status, accounting connection, cards on or off and card limit;
  - reviews and responses, profile activity;
  - exports, plan and billing.

**Client (navigation: My jobs, Find a trade, My record)**
- **My jobs:** each job with planned start, progress, paid so far, and what's due next.
- **Quote page:** accept, ask for changes or decline, and pay a deposit if asked, with the refund position shown.
- **Job page:**
  - start date (confirm or suggest another);
  - stage timeline with photos, approve or raise an issue, approve variations;
  - pay (bank details and reference with copy buttons, "I've paid", card if offered), in full or in parts;
  - deposit position, invoices, receipts and credit notes;
  - the review once open.
- **Find a trade,** with Email now on each profile.
- **My record:** figures and reviews from trades. Account details, including person or company.

**Admin:** existing admin plus:
- stage issues, request payment anyway activity, chargebacks, deposit disputes;
- payment flags (client says not paid, refund disputes);
- bank connection health (lapsed connections, unsupported banks), open banking usage and cost per trade;
- accounting sync health by platform;
- review windows and publication;
- seeded outreach status, including profile views and Email now clicks on seeded listings;
- trial and subscription overview, and rolling 12 month subscription revenue against the VAT threshold.

**Marketing pages:** home, for trades, for clients, pricing, FAQ and the claim page are rewritten for v4.1.
- **Lead:** trust built on paid jobs ("Know who you're working with").
- **For trades:** "Every job agreed. Every job paid.", the platform as the way to get there, and the accounting logos.
- **For clients:** reviews from real, paid jobs.
- **Price:** £19.99 a month after a 30 day free trial, no transaction fees on bank payments.

## 19. Before launch (non build)

1. **Choose the open banking provider.** It needs account information only (reading incoming payments on the trade's account), with Confirmation of Payee if available. No payment initiation. It must meet all of these:
   - read only access, with WorkedWith never able to move money;
   - a low, flat price per connected account per month (or per data refresh), not a percentage;
   - **no minimum monthly commitment** at startup volumes, or a low one;
   - WorkedWith can operate **under the provider's FCA licence** (as their agent or customer) without its own authorisation;
   - it covers the banks trades use, including Tide, Starling, Monzo Business, Barclays, Lloyds, HSBC, NatWest and Santander;
   - target total cost under £1 per connected trade per month.

   Shortlist for quotes: TrueLayer, Yapily, Finexer, Plaid. Compare at 100, 1,000 and 5,000 trades.
2. **Register developer apps** with Xero, Intuit (QuickBooks), FreeAgent and Sage, and check each one's:
   - app review or certification steps;
   - any cap on connections before certification;
   - Xero's app partner tier and monthly fee for our expected connections and data use.
3. **Solicitor review** of:
   - the default trade terms, the cancellation notice and its wording, and the start within 14 days consent;
   - refundable and non refundable deposit wording, including the made to measure exception and how non refundable deposits apply to person clients;
   - the request payment anyway wording;
   - both letter before action versions and all chasing copy;
   - the review rules, including publishing a single review when the window closes.
4. **Legal check on the client record:** showing the full record (payment figures and reviews) to any trade quoting the client or looking them up by email or mobile, without the client's consent, relying on legitimate interests under UK GDPR. Includes the privacy notice wording clients see when they open an account, and how a client can challenge an inaccurate review. Confirm it doesn't amount to credit referencing.
5. **Confirm the chasing is not regulated debt collection:** it is software sending the trade's own reminders in their name.
6. **PECR:** confirm outreach to limited companies only, with opt out wording.
7. **Stripe:**
   - Stripe Billing for the subscription;
   - Stripe Connect for optional cards, with connected accounts set up so Stripe handles pricing (no per account or per payout fees for WorkedWith);
   - dispute handling set up;
   - old Standard and Pro prices archived.
8. **Twilio:** the existing alphanumeric "WorkedWith" sender for one way messages is enough; no two way number is needed.
9. **Accountant:** check the invoice layout and export columns, and when WorkedWith will need to register for VAT.
10. **Privacy policy and terms** updated for payments, bank connections and bank data, accounting connections, the client record, reviews and record retention.
11. **Marketing pages** rewritten (section 18), and the landing video intro updated to lead with trust.

## 20. Build plan from the current codebase

The current platform is a review and directory product built for v3.x: tiers, Boosted Districts, backdated jobs, organisations, confirmations and decline reasons. Phase 0 strips it back to a clean base. Everything after it builds the quote to paid platform on top, reusing auth, phone verification, profiles, Find, districts, /t/[slug], blind reviews, disputes, seeded listings, admin, Resend and Twilio.

Each phase builds clean (npm run build), passes a test, and deploys before the next starts.

| Phase | What | Reuses or removes |
|---|---|---|
| 0 | **Cleanup.** See below. | Removes tier code, backdated and trade invite flows, v3.7 decline and evidence UI, organisation UI, old job confirmation UI |
| 0.5 | **Landing page:** update and improve home, for trades, for clients, pricing and FAQ to reflect the platform for both trades and clients: the positioning in section 1, the plain cost table in section 3, the landing video. Marketing pages only; nothing behind the login changes | Existing marketing pages, design canvas, video |
| 1 | **Getting paid setup:** bank details with Confirmation of Payee, open banking bank connection, reconfirmation prompts | Open banking provider (behind an internal interface) |
| 2 | **Client accounts from quote links:** text code, no password, person or company | Auth, Twilio Verify, client profiles |
| 3 | **Quotes:** builder, saved items, versions, optional deposit with refund settings, planned start, send, follow ups, client acceptance, ask for changes, decline | Jobs table (extended), notifications |
| 4 | **Start dates and job events:** propose, confirm, change, materials ordered, mark started, early start consent | Notifications, photo upload |
| 5 | **Stages and payments:** mark done with photos, approve or raise issue, day 5, 10 and 14 reminders, request payment anyway, "I've paid", automatic matching, probable matches, part payments, paid elsewhere, refunds, deposit position on cancellation, receipts | Open banking, photo upload and moderation, dispute machinery for issues |
| 6 | **Invoices, credit notes, sequential numbering** (also the payment reference), CSV and PDF exports | PDF generation |
| 7 | **Variations** | Notifications |
| 8 | **Chasing engine** (scheduled job), letter before action (person and company versions), claim pack PDF | Resend, Twilio |
| 9 | **Reviews on WorkedWith jobs:** new opening rules, 14 day window (Airbnb style), editing until the other side submits, review photos, labels, client record shown in full to quoting trades | Existing blind reviews, review responses, disputes, red_flag_count, lookup and search audit log |
| 10 | **Directory and profiles:** paid jobs and member since figures, featured jobs from paid jobs, flat photo and district limits, public business email and Email now, ranking members above seeded, profile activity for all | Find, districts, /t/[slug], v3.9 trust signals, gallery, featured jobs, analytics |
| 11 | **Accounting integrations:** internal interface, then Xero, QuickBooks, FreeAgent and Sage adapters, sync status and retries | New |
| 12 | **Seeded changes:** 90 days, new reminder points with activity (views and Email now clicks), claim starts trial, limited company outreach rule, honest seeded profile | Seeded directory, Companies House API |
| 13 | **Optional cards:** Stripe Connect (Stripe handles pricing), card limit, card refunds, chargeback evidence | Stripe |
| 14 | **Record retention,** account closure, bank and accounting data rules (scheduled job) | Existing account deletion and anonymisation |
| 15 | **Trade home, navigation, desktop and mobile polish,** set up checklist, claim page, final marketing page pass | Existing layout and brand |

**Phase 0 cleanup in detail**

1. **Single plan:**
   - One Stripe price at £19.99 monthly, with a 30 day trial and no card.
   - subscription_status and trial dates on trade profiles.
   - Lapse rules (section 3).
   - Admin plan grants kept, but changed to grant "the plan" rather than Standard or Pro.
2. **Remove tier gating everywhere it's checked today:**
   - gallery limits, featured jobs, profile analytics;
   - client profile detail and lookup;
   - dispute priority;
   - search results;
   - the subscription and pricing pages;
   - email templates mentioning Standard or Pro.

   Replace them with a single "has active plan" check.
3. **Rework Boosted Districts** to the add-on model: no boosts included in the plan, £10 a month per district for any subscribed trade, cap of 3 boosted trades per trade type per district, per district switch in admin, "Boosted" label. Operating districts stay at up to 20.
4. **Remove backdated jobs** (/jobs/log/backdated) and trade to trade job invites (/jobs/log/invite-trade).
5. **Hide the old job flow:**
   - logging a job for confirmation (/jobs/log, /jobs/confirm, /invite/job);
   - v3.7 decline reasons and evidence (/requests/[id]/evidence);
   - v3.9 ended early.

   Phase 3 replaces these with quotes. Keep the tables until launch, then drop them in a migration once nothing reads them.
6. **Hide organisation and business client screens** (/org/*, /onboarding/business, /join/client/business) and admin organisation tools. Tables stay.
7. **Hide client added listings** (v3.8 item 5) and the client initiated trade claim flow, until the decision in section 25.
8. **Reset test data** before the first real trade: jobs, reviews, review windows and invites created during testing. Seeded listings and real accounts stay.

**Milestones**
- **One launch, after phase 15,** with everything working: the full quote to paid platform, all four accounting integrations (optional for trades), cards, reviews, the directory and boosts. No founding beta before launch.
- **Founding offer at launch:** 3 months free for the first 50 trades in WA14 and WA15, applied with admin plan grants.

Build the open banking and accounting integrations behind small internal interfaces, so providers can be swapped or added without touching the rest of the app.

## 21. Data model additions (outline)

All new tables have RLS. Trades see their own business's rows; clients see rows for their own jobs; admin sees all.

**Getting paid**
- **trade_bank_accounts:** trade_id, account_name, sort_code, account_number (encrypted), confirmation_of_payee_result, provider, provider_connection_id, connected_at, consent_expires_at, connection_status (not_connected, connected, needs_reconfirm, lapsed, unsupported).
- **trade_card_accounts (optional cards):** trade_id, stripe_account_id, charges_enabled, payouts_enabled, card_limit_pence, cards_enabled.
- **bank_matches:** trade_id, provider_transaction_id, received_at, amount_pence, payer_name, reference, match_status (matched, part_payment, overpayment, suggested, confirmed_by_trade, rejected_by_trade), invoice_id. Only matched or suggested payments are stored.

**Accounting**
- **accounting_connections:** trade_id, platform (xero, quickbooks, freeagent, sage), external_org_id, external_org_name, tokens (encrypted), token_expires_at, sales_account_code, payment_account_id, vat_mapping (json), sync_from, status (connected, expired, revoked, error), connected_at.
- **accounting_sync_items:** connection_id, entity_type (contact, invoice, payment, credit_note, refund), entity_id, external_id, status (pending, synced, failed), attempts, last_error, synced_at.

**Profiles**
- **trade profiles (extended):** trading_address, reply_email, invoice_prefix, next_invoice_number, default deposit settings (deposit_for, refundable, non_refundable_from), default payment terms in days, trial_started_at, trial_ends_at, subscription_status (trialing, active, lapsed, cancelled). Remove subscription_tier after phase 0. Keep boosted_districts and the add-on quantity fields for the add-on.
- **client profiles (extended):** client_type (person, company), company_name, companies_house_number (optional, free text, not verified), closed_at.
- **saved_items:** trade_id, description, price_pence, vat_applies.
- **featured_jobs (changed):** must link to a paid WorkedWith job. Limit enforced (section 3).

**Quotes and jobs**
- **quotes:**
  - job_id, version, status, valid_until, client_type_at_acceptance;
  - deposit settings: deposit_required (boolean), deposit_amount_pence, deposit_for (materials, labour, materials_and_labour), deposit_refundable (boolean), deposit_non_refundable_from (materials_ordered, work_started, payment; payment only for company clients);
  - payment_timing (on_completion, in_stages);
  - planned_start_type (date, asap, to_be_agreed), planned_start_date;
  - vat_registered, totals in pence;
  - terms_snapshot (the exact terms text and deposit wording accepted);
  - follow_ups_enabled;
  - sent_at, viewed_at, accepted_at, accepted_by_user_id, declined_reason.
- **quote_lines:** quote_id, position, description, price_pence.
- **quote_change_requests:** quote_id, note, requested_by_user_id, created_at, resolved_by_version.
- **start_date_proposals:** job_id, proposed_date, proposed_by_user_id, status (proposed, confirmed, countered, withdrawn), decided_at, decided_by_user_id.
- **jobs (extended):**
  - statuses: quoted, booked, in_progress, completed, paid, cancelled, disputed;
  - source: own_customer, directory;
  - dates and evidence: agreed_start_date, materials_ordered_at, materials_order_evidence_path, started_at;
  - person clients: cancellation_period_ends_at, early_start_consent_at, early_start_consent_by_user_id;
  - cancellation: cancelled_at, cancelled_by_user_id, cancellation_reason, deposit_outcome (refund_due, refunded, retained), made_to_measure_confirmed (boolean);
  - retain_until.

**Stages and payments**
- **payment_stages:** job_id, quote_id, position, name, amount_pence, is_deposit, status, marked_done_at, approved_at, approved_by_user_id, requested_by_trade_at, request_note, due_at, amount_paid_pence.
- **stage_evidence:** stage_id, photo paths, note, created_at.
- **stage_issues:** stage_id, raised_by_user_id, reason, photos, status, resolved_at.
- **issue_notes:** issue_id, author_user_id, note, photos, created_at. Also used for dispute notes. There is no general messaging table.
- **variations:** job_id, description, note, amount_pence (positive or negative), photos, status, sent_at, decided_at, decided_by_user_id, decline_note, applied_to_stage_id.
- **payments:**
  - stage_id, invoice_id, amount_pence;
  - method: bank_transfer_matched, bank_transfer_marked_by_trade, paid_elsewhere_cash, paid_elsewhere_cheque, paid_elsewhere_other_account, card, wallet;
  - references: bank_match_id, stripe_payment_intent_id, stripe_fee_pence;
  - status: client_says_paid, paid, failed, refunded;
  - paid_at, client_confirmed_at (for paid elsewhere);
  - refunds: refunded_pence, refund_marked_at, refund_client_confirmed_at.
- **invoices:** trade_id, job_id, stage_id, invoice_number, issued_at, due_at, net_pence, vat_pence, total_pence, status (issued, part_paid, paid, credited), pdf_path, approval_basis (client_approved, requested_by_trade, deposit).
- **credit_notes:** invoice_id, credit_note_number, amount_pence, reason, issued_at, pdf_path.
- **chargebacks (card trades only):** payment_id, stripe_dispute_id, opened_at, evidence_due_at, evidence_submitted_at, outcome, closed_at.
- **chase_events:** stage_id, step, channel, sent_at, opened_at, paused, stopped_by.

**Reviews and records**
- **review_windows (changed):** job_id, opened_reason (paid, overdue_30_days, cancelled_after_start), opened_at, closes_at, both_submitted_at, closed_at.
- **reviews (extended):** label (paid_job, unpaid, ended_early), published_at, editable_until.
- **review_photos:** review_id, path, moderation_status, created_at (up to 5 per review).
- **client_record_views:** trade_id, client_id, reason (quoting, lookup), job_id, viewed_at (for the audit log and the 12 month rule).

**Other**
- **legal_documents:** job_id, type (letter_before_action, claim_pack, chargeback_evidence), version (person, company), file path, generated_at, sent_at, response_due_at.
- **open_banking_usage:** trade_id, month, connection_active, data_refreshes, cost_pence (for tracking cost per trade).

**Rules across the model**
- All money is stored as integers in pence.
- Every approval and confirmation records the approving user and the timestamp, and must come from the client's authenticated session.
- Invoice numbers are allocated in a transaction so they never skip or repeat.

## 22. Communication on the platform

- No general chat or inbox. Trades and clients use their own channels (WhatsApp, text, phone).
- Written notes exist only on quote change requests, variation decisions, stage issues, request payment anyway, review responses and disputes.
- Clients finding a trade in the directory use Email now, which goes to the trade's own email, not through WorkedWith. These form part of the record and the claim pack.
- Replies to emails sent on a trade's behalf go to the trade's reply email.
- Texts are one way only. Replies to the WorkedWith sender aren't read.

## 23. What happens to existing features

| Feature | Decision |
|---|---|
| Free, Standard, Pro tiers, photo ladder, annual prices | Removed (phase 0). One plan. |
| Boosted Districts | Kept as the only paid add-on: £10 a month per district, labelled, capped per district, switched on per district by admin. |
| Backdated (past) jobs | Removed. Reviews come only from WorkedWith jobs. |
| Trade to trade job invites (/jobs/log/invite-trade) | Removed. A trade working for another trade is a client relationship: one quotes, the other accepts as a company client. |
| Logging a job for confirmation, job invites to clients, /jobs/confirm | Replaced by quotes. Hidden in phase 0, removed after launch. |
| v3.7 decline reasons, confirmation rate and evidence route | Superseded. A quote the client accepts is the confirmation. |
| v3.9 ended early | Replaced by cancellation after work started, which opens reviews. |
| v3.9 confidence ranking, hired again, Insured | Keep. |
| Blind reviews, review responses, disputes, red_flag_count | Keep, with the Airbnb style rules and review photos (section 13). |
| Profile gallery and featured jobs | Keep for every trade, with flat limits. Featured jobs only from paid WorkedWith jobs. |
| Profile analytics (was Pro) | Keep for every trade, simplified. |
| Client lookup and search audit log | Keep for every trade. Visibility follows section 14. |
| Client profile pages (/c/[username]) | Become the client record page, shown to trades only as section 14 allows. Not reachable by username alone. |
| Organisations, business client accounts, members, Companies House director match | Parked. UI hidden, tables kept untouched. |
| v3.8 item 1 integrity flags | Keep, low priority. Backdated rules no longer apply. |
| v3.8 item 2 job link and QR | Keep, now points to the public profile. |
| v3.8 item 3 "ID checked" wording | Keep. |
| v3.8 item 4 client share links | Removed. Client records show in full to quoting trades (section 14). |
| v3.8 item 5 clients add a non member trade | Parked (decision in section 25). |
| Client initiated trade claim flow (/invite/claim) | Decision in section 25. |
| v3.8 item 6 admin plan grants | Keep, one plan. |
| v3.8 item 7 admin analytics | Keep. Add quotes sent, accepted and paid per week, and quote requests to seeded trades. |
| Seeded directory | Keep, changed as section 16. |
| ID verification (licence or passport plus live selfie) | Keep, optional, shows "ID checked". |

## 24. Do not build

- **Job management:** diaries, scheduling or calendars (a single planned start date per job is not a diary). Timesheets, expenses or stock (marking materials ordered is a single job event, not stock tracking).
- **Messaging:** general messaging, chat or an inbox.
- **Accounting:** reading data from accounting software, two way sync, or accounting platforms beyond the four (the CSV export covers the rest). A unified accounting API.
- **Payments and money:**
  - instalment plans or customer finance;
  - escrow, provider holding accounts or holding funds in any form;
  - reading or storing anything from the trade's bank beyond incoming payments matched to invoices;
  - saved client cards and card surcharges;
  - any fee on the trade's payments;
  - a "platform handles pricing" Stripe Connect setup.
- **Approvals:** automatic approval of anything, approval by the trade, and text reply approvals. Approvals happen only in the client's own account.
- **Collection:** debt collection or claim filing on anyone's behalf. (Chasing unpaid deposits and sending late payment notices in the trade's name are in scope.)
- **Payments started by WorkedWith:** a pay by bank button (payment initiation) at launch.
- **Client controls over their record:** sharing settings or share links.
- **Request a quote forms** in the directory; clients use Email now.
- **Reviews:** backdated or past jobs. Reviews of anyone not party to a WorkedWith job.
- **Checks:** Land Registry checks. Companies House verification of clients.
- **Growth and accounts:**
  - referral programmes for estate agents or others;
  - tiers, or paid placement that isn't clearly labelled;
  - organisations, team members or multi user accounts;
  - native apps.

## 25. Decisions (agreed)

All decisions below were agreed on 16 November 2026.

| # | Decision | Agreed |
|---|---|---|
| 1 | Photo limits now every trade gets photos | **Agreed:** 10 gallery photos; up to 3 featured jobs, 5 photos each, only from paid WorkedWith jobs |
| 2 | Operating districts | **Agreed:** up to 20 (as now). Boosts are a separate paid add-on |
| 3 | Review window length | **Agreed:** 14 days from opening (was 30) |
| 4 | Single review when the other side doesn't submit | **Agreed:** Publishes when the window closes, so silence can't block it |
| 5 | Reviews on non payment | **Agreed:** Window opens at 30 days overdue, review labelled "Unpaid" |
| 6 | What a quoting trade sees without the client's consent | **Agreed:** Rating from trades, number of reviewed jobs, red_flag_count, and whether any job went unpaid. Full figures and review text by consent. Subject to the legal check (superseded by 23) |
| 7 | Quote requests to seeded trades | **Agreed:** Yes: email the trade, show the client up to 3 member trades (superseded by 24) |
| 8 | Client initiated trade claim flow and client added listings | **Agreed:** Park both. Replace with a simple "Invite your trade to WorkedWith" email from the client, no review attached |
| 9 | Trade to trade jobs | **Agreed:** Removed; handled as an ordinary quote to a company client |
| 10 | Old job, decline and organisation code | **Agreed:** Hide in phase 0, delete after launch once nothing reads it |
| 11 | Test data | **Agreed:** Reset jobs and reviews before the first real trade; keep seeded listings and real accounts |
| 12 | Founding offer | **Agreed:** Use admin plan grants: 3 months free for the first 50 trades in WA14 and WA15 |
| 13 | Home page headline | **Agreed:** "Know who you're working with." as the main line, "Every job agreed. Every job paid." in the trades section |
| 14 | Founding beta | **Agreed:** no beta. Launch once everything works, with all four integrations live (optional for trades) |
| 15 | Boosted slots per district | **Agreed:** Up to 3 boosted trades per trade type per district, with a waiting list |
| 16 | When boosts go on sale | **Agreed:** Switched on per district by admin once clients are searching there, starting with WA14 and WA15 |
| 17 | Boosts during the free trial | **Agreed:** Not available until the trade is on the paid plan |

**Decisions of 24 November 2026 (v4.2)**

| # | Decision | Agreed |
|---|---|---|
| 18 | Mobile | Trades can create and edit quotes and send variations fully on a phone. The client side is designed for a phone first. Desktop stays first class |
| 19 | How clients approve | Only in their own signed in account. Text reply approvals removed |
| 20 | Stalled stages | Automatic reminders at day 5, 10 and 14. Never approved by the trade. Request payment anyway stays available after day 14, always labelled not approved by the client (to be confirmed) |
| 21 | Costs | £19.99 a month is the only WorkedWith cost. Open banking only reads incoming payments to mark invoices paid; no pay by bank button. Card fees only if the trade switches cards on, charged by Stripe directly |
| 22 | Reviews | Airbnb style: 14 days, hidden until both submit or the window ends, edit until then, then locked. Up to 5 photos per review |
| 23 | Client records | Full record shown to any trade quoting the client or looking them up by email or mobile. Never public. No share settings |
| 24 | Public trade profile | Business name, reviews and business email, with an Email now button (subject "Quote request via WorkedWith"). Request a quote form and seeded quote request emails removed |
| 25 | Trade set up order | Join or claim, build profile, bank details and open banking, accounting software, then quote |
| 26 | Seeded trades with several trades | Shown for each trade where that trade has fewer than 3 real trades in the district |
| 27 | Deposits and late payments | Unpaid deposits chased at day 1, 3 and 6; late payment notices from 3 days overdue |
| 28 | Build order | Landing page becomes phase 0.5, after cleanup and before bank details |
| 29 | Directory role | Mainly for clients who have had a job done through WorkedWith and want other trusted trades nearby, not a Google for trades |

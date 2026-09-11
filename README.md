# KAL Catering — Order Screener

An order intake app for outdoor catering at Karaikudi Annalakshmi.

- **Customer** (`/request`) — a public page with no login and none of the staff tools
  visible. They verify their phone number with a one-time code, then fill in their own
  name, event address, and menu choice. Verifying the phone number first is what keeps this
  from filling up with frivolous or fake enquiries — it's a real, reachable number by the
  time a submission lands in front of staff.
- **Staff** (everything else) — one shared role now, not split into junior/senior. Since
  the customer supplies their own name, address, and menu choice, there's much less manual
  data entry left for a separate junior-executive step; any approved staff member can:
  - take a manual order at `/screener` (still useful for a phone call that didn't use the
    link, or a walk-in)
  - review screened orders at `/review`, with same-day/session conflicts auto-flagged,
    order customization against the full recipe catalog, and status tracking through to
    execution
  - convert customer submissions into orders, message service contractors, manage menu
    templates and the staff list

Staff sign in with email/password (Firebase Authentication). New accounts wait for approval
from an existing staff member before they can use anything — see below.

## 1. Set up Firebase

Create a Firestore project (or reuse one of your existing KAL Firebase projects) and:

1. In the Firebase console, create a Firestore database (production mode is fine — you'll
   add rules below).
2. Add a Web App to the project, and copy the config object.
3. Paste it into `src/lib/firebase-config.js`, replacing the placeholder values.
4. **Enable email/password sign-in** (for staff): Firebase console → Authentication →
   Sign-in method → enable "Email/Password".
5. **Enable phone sign-in** (for customers' OTP): same screen → enable "Phone". Phone auth
   requires your project to be on the **Blaze (pay-as-you-go) plan** — each SMS costs a
   small amount (Firebase gives an up-to-date price per country in the console). There's a
   free quota, but budget for SMS cost once the link is genuinely circulating.
6. Firestore rules — staff actions require a signed-in **and approved** staff account;
   customers only need to be phone-verified to submit their own request and can't see
   anyone else's:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       function isApprovedStaff() {
         return request.auth != null &&
           exists(/databases/$(database)/documents/staff/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/staff/$(request.auth.uid)).data.approved == true;
       }

       match /staff/{uid} {
         allow read: if isApprovedStaff();
         allow create: if request.auth != null && request.auth.uid == uid;
         allow update: if isApprovedStaff();
       }
       match /orders/{orderId} {
         allow read, write: if isApprovedStaff();
       }
       match /menuTemplates/{templateId} {
         allow read: if true;
         allow write: if isApprovedStaff();
       }
       match /recipes/{recipeId} {
         allow read, write: if isApprovedStaff();
       }
       match /contractors/{contractorId} {
         allow read, write: if isApprovedStaff();
       }
       match /customerSubmissions/{submissionId} {
         allow create: if request.auth != null;
         allow read, update, delete: if isApprovedStaff();
       }
       match /callEvents/{eventId} {
         allow read: if isApprovedStaff();
         allow write: if false;
       }
     }
   }
   ```

   `menuTemplates` stays publicly readable (the customer form's menu dropdown needs it) but
   only approved staff can edit it. `customerSubmissions` can be created by any
   phone-verified visitor (that's the point of the form) but only approved staff can read or
   update the collection — a customer who just verified their own number still can't see
   anyone else's submission.

## Staff accounts & login

There's no self-service sign-up — that's intentional, so random people can't add themselves
as staff. To onboard someone:

1. Firebase console → Authentication → Users → **Add user** → enter their email and a
   password (they can change it later from the Firebase console if needed; there's no
   in-app "change password" yet — say so if you want one).
2. They open the app and sign in. The **very first account ever to sign in** is
   automatically approved, so there's someone able to approve everyone else — after that,
   new accounts land on a "waiting for approval" screen.
3. An approved staff member goes to the **Staff** tab, finds their email, and clicks
   **Approve**. They can now use the app immediately (no need to log out/in again).

The app writes to a single `orders` collection — no manual setup needed, Firestore creates
it on first save.

## 2. Run locally

```
npm install
npm run dev
```

## 3. Push to GitHub

```
git init
git add .
git commit -m "Initial KAL catering order screener"
git branch -M main
git remote add origin https://github.com/karaikudiannalakshmi/kal-catering-screener.git
git push -u origin main
```

## 4. Deploy on Vercel

Import the repo in Vercel — it will auto-detect the Vite build (`npm run build`, output
`dist/`). No environment variables needed since the Firebase config is in the source file,
same as your other apps.

## Menu templates

Templates live in a `menuTemplates` collection (name, session, price per pack, item list with
quantity + unit per pack) and are managed from the **Menu templates** tab — the same
item/quantity shape as your Kitchen ERP order-template-details screens, so nothing needs
re-typing between the two systems.

Sessions are **Breakfast, Lunch, Dinner** — Snacks was dropped since you don't have a Snacks
menu; if that changes later, it's one line back in `src/lib/constants.js`.

**Price per pack** is required when adding or editing a template — it's what customers see
on each menu card, and what the estimated-total line on their submission is calculated from.

Three Breakfast templates, four Lunch templates, and four Dinner templates from your Kitchen
ERP screenshots are pre-written into `scripts/seedMenuTemplates.mjs`. After you've filled in
`src/lib/firebase-config.js`, seed them once with:

```
node scripts/seedMenuTemplates.mjs
```

That gets Breakfast Menu 1/2/3, Lunch 1/2/3/4, and Dinner 1/2/3/4 into the dropdown
immediately, each with its official fixed price from your Breakfast/Lunch/Dinner quotation
PDFs:

| Session | Menu | Price |
|---|---|---|
| Breakfast | 1 / 2 / 3 | ₹240 / ₹270 / ₹330 |
| Lunch | 1 / 2 / 3 / 4 | ₹270 / ₹330 / ₹390 / ₹475 |
| Dinner | 1 / 2 / 3 / 4 | ₹250 / ₹350 / ₹420 / ₹500 |

Quantities are still exactly as pulled from the Kitchen ERP order-template-details
screenshots — the quotation PDFs confirmed prices and item names, not quantities, so
nothing there needed changing. **Dinner 2** was cut off mid-list in its original source
screenshot before the subtotal/count row; the quotation PDF's Menu 2 doesn't list a separate
paper-goods line either, so it's likely already complete, but worth one glance at the
Kitchen ERP if you want to be certain.

## Recipe master list — customization

`data/recipes.csv` is your full recipe list exported from Kitchen ERP (1,364 rows; the
import keeps the 1,113 that are active, sellable recipes — sub-recipe components and
disabled entries are skipped). Import it with:

```
node scripts/seedRecipes.mjs
```

This powers a searchable recipe picker (type to filter, shows category and unit) used in
two places:

- **Menu templates** — when adding items to a template, you now search the recipe catalog
  instead of typing free text, so template items stay aligned with the master list.
- **Review dashboard → "Customize order"** — a staff member can open any screened
  order, start from its template's item list, and freely add/remove/adjust items by
  searching the same recipe catalog. Saved customizations are marked with a "Customized"
  badge and stored per-order (`customizedItems`), separate from the template itself — so
  customizing one order never changes the shared template.

If a needed item genuinely isn't in the catalog yet, the picker has a "use as typed"
fallback so it's never a hard block — just flag it to add to the Kitchen ERP recipe list
later.

Re-run `node scripts/seedRecipes.mjs` any time you export a fresh recipe list from Kitchen
ERP (replace `data/recipes.csv` first) — it overwrites by recipe ID rather than duplicating.

### A note on alignment

Cross-checking the 11 templates already seeded against this recipe list, all but 10 of the
165 item references matched exactly. Most of those 10 are just spacing/spelling variants of
a recipe that does exist (e.g. "Order- Idly" vs. the catalog's "Order - Idly", "Tiffin-Kalla
Veettu Avial" vs. "...Aviyal"). A few are more ambiguous — a generic "Pickle" where the
catalog has several specific pickle types, and "Payasam - Moongdhall Payasam" without an
obvious single match — worth a quick look next time you edit those templates, since the
recipe picker will now show you the real options.

The order form filters templates by session and shows a read-only item preview
once one is picked, so they can double-check they've selected the right one before saving.
The same-day/session conflict check now compares by template ID rather
than typed text, so it's exact.

## Dispatch planning fields

The screener now also captures:

- **Live counter needed?** (Yes/No)
- **Service personnel needed?** (Yes/No)
- **Serve time** — what time the customer wants food served
- **Site distance (km)** — looked up on Google Maps outside the app and typed in; there's no
  Maps API integration, this is just a manual field staff can use alongside
  serve time to plan dispatch.

All four show on the review dashboard's order detail grid.

## Service personnel — contractor messaging

Since a Porter API integration wasn't available, this is a manual-send flow instead:

1. Add your contractors (name + WhatsApp number) under the **Contractors** tab.
2. On the review dashboard, any order marked "service personnel needed" shows a green panel:
   a staff member enters the headcount (their judgment call — pax, dining hall
   capacity, number of items being served), picks a contractor, and a message is composed
   automatically with the date, session, serve time, pack count, venue, and headcount.
3. **Send via WhatsApp** opens `wa.me` with the message pre-filled to that contractor's
   number (Indian 10-digit numbers are auto-prefixed with `91`) — one tap to send, no API
   key or integration needed. **Copy message** is there as a fallback for any other channel.

Headcount and the chosen contractor are saved on the order (`personnelCount`,
`contractorId`), so reopening it later keeps what was already decided.

## Customer acknowledgement

Right after staff save a screened order, a green panel appears with a
ready-to-send WhatsApp message to the customer: confirms the order's been taken for
evaluation and that an executive will call soon, then lists everything noted down — date,
session, packs, menu and its items, delivery address, serve time, live counter / service
personnel answers, other services, and any notes — so there's no confusion later about what
was actually discussed. Same **Send via WhatsApp** / **Copy message** pattern as the
contractor panel, sent to the customer's own number this time. The panel has a **Dismiss**
button so it doesn't block taking the next order.

## Customer intake form — direct entry, no typos

There's now a public, no-login page at `/request` (e.g.
`https://your-app.vercel.app/#/request`) where a customer verifies their phone number, then
fills in their own name, event address, date, pax count, and menu choice — straight into
Firestore, in their own words, with no relay through a phone call. It shows none of the
staff tools, just the form.

Workflow:

1. **Customer submissions** tab (in the staff nav) has a **Customer intake link** panel
   at the top — copy it, or type in a phone number and send it straight via WhatsApp.
2. The customer opens the link, enters their phone number, gets a 6-digit code by SMS, and
   enters it to confirm it's really them.
3. Only after that do they see the actual form: name, event address, the date they need the
   food, and pax count (number of packs), then which meal (breakfast/lunch/dinner), then
   every menu for that meal shown with its **actual item list and price per pack** — not
   just a name they have to guess at — so they pick knowing what's in it and what it costs.
   If both price and pax count are known, they see an estimated total right there. Then a
   yes/no on whether they'd like any changes to the items (with a text box if yes), yes/no
   on a live counter and on needing service staff, and a short disclaimer — order is
   evaluated against the day's other bookings, live counters depend on staff availability,
   and price may change if they request menu changes — right before they submit. Submitting
   writes all of that to Firestore with `phoneVerified: true` and their Firebase phone-auth
   UID attached.
4. It shows up in **Customer submissions** as a card with their name, address, date/pax
   count, menu, estimated total, live-counter/service-staff answers, and any requested
   change — marked **Verified**.
5. Click **Start order** to jump into the screener form with all of that already filled in
   — name, phone, address, date, packs, session, menu, live counter, service personnel, and
   any requested change copied into the notes field. Staff mainly just need to check it over
   and add the serve time. The submission is marked "used" once that order is saved, and
   moves to the "Already converted" list below.

The customer picks their meal first (breakfast/lunch/dinner), then sees every menu for that
meal with its full item list and price rendered right there — no guessing what "Breakfast
Menu 2" actually contains or costs. Selecting one reveals the change-request question, so
the flow never shows fields the answer to a previous one would make pointless.

### Returning customers — no repeat OTP

Two ways a customer skips the SMS code on a later visit:

- **Same phone/browser** — Firebase keeps them signed in between visits by default (this
  needed no extra building; it's how Firebase Auth sessions normally persist). They land on
  `/request` and go straight to the form, no phone number or code needed again, until they
  explicitly sign out somewhere or clear their browser data. There's no "sign out" button on
  the customer form, so in practice this just works silently.
- **Different device** — this does need a password, since there's no shared session to fall
  back on. Right after their first OTP verification (or the first time they land on the form
  via an already-open session that's never set one), they're offered an optional "set a
  password" step. If they do, next time — from any device — they can tap **"I've set a
  password before"** on the phone-entry screen and sign in with phone number + password
  instead of waiting for a text.

Under the hood, Firebase's password sign-in is keyed by email, not phone number, so the
customer's verified phone number is mapped to a synthetic, never-shown email address
(`p<digits>@customer.kalcatering.app`) and the password is linked to that — it's the same
underlying account either way (same Firestore `customerUid`, same real phone number on the
Auth record), so a password sign-in still carries the original phone verification: it's not
a way around the OTP step, just a second door into the same verified account. Setting a
password is always optional; skipping it just means they'll get a fresh code next time from
a new device, same as today.

### Why phone verification, and what it costs

The point of the OTP step is exactly what you asked for — cutting down frivolous or fake
enquiries. A submission can only exist if it came from a real, reachable phone number, and
the Firestore rules only let phone-verified visitors create their *own* submission (not
read anyone else's, not spam the same one repeatedly without a fresh verified session).

Two real setup costs this adds beyond everything else in this app:

- Your Firebase project needs to be on the **Blaze (pay-as-you-go)** plan for phone auth to
  work at all — Firestore itself has stayed within the free tier so far, but SMS does not.
- Each OTP costs a small amount per SMS (Firebase's console shows the current per-country
  rate). At catering-enquiry volumes this should be a trivial monthly cost, but it's not
  zero the way the rest of this app has been.

### Auto-send on incoming call (Exotel)

Since you already have Exotel, this is built: `functions/exotelCallWebhook` is a Firebase
Cloud Function that Exotel calls when someone rings your number, which then texts them the
`/request` link automatically via Exotel's own SMS API, and logs the attempt so staff can
see it worked — that log shows up as **"Recent calls (auto-sent via Exotel)"** at the
bottom of the Customer submissions page.

**One-time setup:**

1. Install the Firebase CLI if you don't have it: `npm install -g firebase-tools`, then
   `firebase login` and, from this project's root, `firebase use <your-firebase-project-id>`.
2. Your project needs to be on the **Blaze plan** for Cloud Functions to deploy (same plan
   phone-auth OTP already needs — if you've enabled that, you're covered).
3. Set the secrets the function needs (from this project's root — each command prompts you
   to paste the value):

   ```
   firebase functions:secrets:set EXOTEL_SID
   firebase functions:secrets:set EXOTEL_API_KEY
   firebase functions:secrets:set EXOTEL_API_TOKEN
   firebase functions:secrets:set EXOTEL_SENDER_ID
   firebase functions:secrets:set WEBHOOK_SHARED_SECRET
   firebase functions:secrets:set APP_BASE_URL
   ```

   - `EXOTEL_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN` — from Exotel dashboard → Settings →
     API Settings.
   - `EXOTEL_SENDER_ID` — the Sender ID / ExoPhone number you send SMS from. **Note:** in
     India, sending SMS requires your sender ID and message template to be registered on the
     government DLT platform first (Exotel's dashboard has a DLT registration section) —
     unregistered messages typically get silently blocked by carriers, so do this before
     relying on the automation.
   - `WEBHOOK_SHARED_SECRET` — make up any random string yourself. This is what stops a
     stranger who finds your function's URL from triggering SMS sends on your account, since
     Exotel doesn't sign its webhook calls.
   - `APP_BASE_URL` — your deployed app's URL with a trailing slash, e.g.
     `https://kal-catering-screener.vercel.app/`.

4. Deploy: `firebase deploy --only functions`. This prints the function's URL, something
   like `https://<region>-<project-id>.cloudfunctions.net/exotelCallWebhook`.
5. In the Exotel dashboard: **App Bazaar → create a new App**, add a **Passthru** applet as
   the first (or only) step, and set its URL to your function's URL with the secret
   attached: `https://.../exotelCallWebhook?token=YOUR_WEBHOOK_SHARED_SECRET`. Then connect
   that app to the ExoPhone number customers call — **Numbers → Manage Numbers → your
   number → Call Flow** → point it at the app you just made.

From then on: someone calls (or gives a missed call, if that's how you've set up the
number) → Exotel hits the function → the function texts them the intake link and logs it →
staff see it appear under "Recent calls" on the Customer submissions page, whether the SMS
sent successfully or not (so a DLT registration problem, for instance, would show up there
as a failure rather than silently vanishing).

The manual **Send link via WhatsApp** button stays as-is for anyone staff wants to text the
link to directly, independent of this automation.

## Billing

Since recipe rates, transport, and a formal bill are now part of the flow, here's how the
pieces fit together.

**Recipe rates** — the **Recipes** tab is new: search the 1,113-recipe catalog and set a
**Rate (₹ per unit)** on each one — that's what billing is computed from. Recipes without a
rate show a "No rate set" flag; you don't have to fill in all 1,113 up front, since the
billing panel below flags exactly which ones are actually needed for a given order and lets
you enter the rate right there.

**Display names** — customer-facing screens (the menu picker on `/request`, and the bill)
show a cleaned-up name with the Kitchen ERP's internal prefixes stripped — "Order- Idly"
becomes "Idly", "VR - Curd Rice" becomes "Curd Rice". This is an explicit list
(`src/lib/displayName.js`) built from what's actually in your seeded data, not a blind
"strip everything before a hyphen" — a few items (like "Chapathy-Tawa") have the dish name
itself before the hyphen, and those are deliberately left alone. Staff-facing screens still
show the raw Kitchen ERP names, since that's what matches your prep sheets.

**Tamil names** — `data/recipes_tamil.csv` is your English/Tamil name list, confirmed to be
in exactly the same row order as `data/recipes.csv` (the original Kitchen ERP export), so
they're joined by position rather than by re-matching text — no ambiguity even with the
handful of duplicate English names in the list. Every Tamil name is exactly what's in the
CSV you sent; nothing here is machine-translated. Import it with:

```
node scripts/importTamilNames.mjs
```

Run this any time after `seedRecipes.mjs` (or before — it uses a merge, so order doesn't
matter). It's also safe to re-run if you send an updated Tamil list later; just replace
`data/recipes_tamil.csv` first.

Once imported, Tamil names show up automatically wherever the app already renders an
item's name from the recipe catalog — the customer's menu picker on `/request`, and the
itemized cost table in the staff Billing panel — shown as a second line under the English
name, in a proper Tamil web font (Noto Sans Tamil) rather than relying on a fallback font
that might render inconsistently across devices. You can also view or edit any recipe's
Tamil name directly from the **Recipes** tab.

**Generating a bill** — on the Review dashboard, each order has a **Billing** button that
opens an internal-only panel:
- An itemized food-cost estimate: every item × (per-pack qty × pax count) × its recipe
  rate. Anything missing a rate shows an inline field to set it right there — that rate is
  saved back to the recipe itself, so it's set for every future order too.
- The template's fixed price per pack, shown alongside the itemized estimate for comparison
  — these two won't always match exactly, since the fixed price is what you quote and the
  itemized figure is closer to raw cost.
- A **rate adjustment (+/-)** field — this is the "not visible to the customer" line: it
  nudges the final price up or down from the template's fixed price (e.g. because the
  customer requested a menu change, or a cost went up), without ever appearing as its own
  line on the customer's bill. The customer only ever sees the resulting price per pack and
  the total — never the adjustment itself or the itemized recipe breakdown.
- A **transport charge** field (and a free-text note for which operator/vehicle) — entered
  manually per the transport operator's tariff at the time of booking, same as your Terms
  and Conditions describe (you arrange it, customer pays per the operator's rate).

**The bill itself** — "View / print bill" opens `/bill/<orderId>` in a new tab: a clean,
no-login-nav page with your letterhead, the customer's details, the menu/pax/price/total,
a note that the price includes 5% GST, and — as page 2, with a real page break for printing
— your Terms and Conditions, transcribed exactly from your T&C document. The **Print / Save
as PDF** button uses the browser's own print dialog, so "Save as PDF" there gives you a
proper two-page PDF without needing any PDF library in the app itself.

## What this does and doesn't do

This is deliberately a **screener**, not the full order pipeline: it does not quote price,
take payment, or talk to the customer. It exists to get ~50% of the repetitive intake work
off staff's plate — data entry and the same-day/session cross-check — while
every pricing decision, negotiation, and confirmation call still goes through them.

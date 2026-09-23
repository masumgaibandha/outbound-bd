@AGENTS.md

# Outbound BD

B2B lead generation and cold email outreach agency site. Next.js App Router,
TypeScript, MongoDB via Mongoose, HeroUI + Tailwind CSS, npm. The agency side
is consultation-led — no client accounts, no client dashboard, and no
self-serve ordering or automatic payment flow. Every agency conversion path
ends at a Calendly booking link or the contact form; agreements and
invoicing happen outside the website.

The one deliberate exception is the masterclass feature (see its own section
below): a live, one-off paid masterclass with its own registration, manual
payment verification, and a small protected admin surface. It does not
change the agency site's own no-account, no-checkout model, and it does not
mean the previously-removed generic agency dashboard/auth/ordering system is
coming back — see the note at the end of Architecture.

A second, narrower exception, added in Round 4A and extended in Round 4B: an
internal, Basic-Auth-gated staff tool at `/admin` for managing inbound leads
(the agency's own `Inquiry` documents), paying clients (`Client` documents),
and their payments (`Payment` documents) — dashboards, filterable/paginated
lists, detail pages with status pipelines and private notes, CSV exports.
This is **not** the previously-removed client-facing dashboard/account/
ordering system: a `Client` document is a staff-facing business record
(company, plan, billing terms, notes), never a login — no client, prospect,
or lead ever authenticates against the site anywhere, and there is still no
self-serve payment flow (every `Payment` is manually recorded by staff after
money is actually received elsewhere, e.g. Wise/Payoneer/bank transfer).
See the note at the end of Architecture for how `/admin` relates to
`/masterclass/admin` and to the removed system.

## Stack

- **Framework**: Next.js 16 (App Router, React 19, React Compiler on)
- **Language**: TypeScript, strict mode
- **UI**: HeroUI v3 (`@heroui/react`, `@heroui/styles`) + Tailwind CSS v4
  (CSS-first config — there is no `tailwind.config.js`; theme and plugin
  wiring live in `src/app/globals.css`)
- **Data**: MongoDB via Mongoose for the agency's `Inquiry`, `Client`, and
  `Payment` collections; the masterclass feature uses the native `mongodb`
  driver's `Collection`/`ClientSession` API (via `src/lib/masterclass/db.ts`,
  reusing the same underlying Mongoose connection) for its own collections —
  see Masterclass below.
- **Package manager**: npm

## Architecture

`src`-based layout. The public route group is the marketing site; the
masterclass feature lives in its own top-level `src/app/masterclass` tree,
outside that group:

- `src/app/(public)` — the marketing site: homepage, `/services` index + 4
  service detail pages, `/about`, `/about/founder`, `/how-it-works`,
  `/results`, `/testimonials`, `/pricing`, `/faq`, `/contact`,
  `/privacy-policy`, `/terms-of-service`
- `src/app/api/inquiries` — validates and persists contact-form submissions
- `src/app/masterclass/lead-generation-cold-email` — the masterclass sales
  page, its own layout (own Bengali font stack, own header/footer), legal
  pages, and OG image
- `src/app/masterclass/admin` — protected admin: orders, students,
  enrollments (see Masterclass below)
- `src/app/api/masterclass` — registration and payment-evidence submission
  routes
- `src/app/admin` — the agency admin (Round 4A: leads; Round 4B: clients,
  payments, revenue): dashboard, `leads`, `clients` (+ `clients/new` for a
  standalone "Add client" not linked to a lead), `payments`, each with a
  list/detail/CSV-export shape (see the note at the end of this section)
- `src/app/sitemap.ts`, `src/app/robots.ts` — SEO metadata routes
- `src/lib` — `env.ts` (validated `MONGODB_URI`), `public-env.ts` (validated
  `NEXT_PUBLIC_APP_URL`), `mongoose.ts` (connection singleton),
  `inquiry-schema.ts` (Zod schema, shared by the form and the API route),
  `models/inquiry.ts` / `models/client.ts` / `models/payment.ts` (Mongoose
  models), `contact-prefill.ts` (pure function resolving `?service=&plan=`
  query params into form prefill values), `pricing-catalog.ts`
  (managed-plan/one-time-offer data, independent from a `Client`'s own
  `plan`/pricing — see below), `normalize-website.ts`
- `src/lib/masterclass` — registration/payment/admin logic: `env.ts` (the
  registration gate and all masterclass env accessors), `validation.ts`
  (Zod schemas), `turnstile.ts`, `rate-limit.ts`, `registrations-repository.ts`
  / `payment-orders-repository.ts` / `students-repository.ts`,
  `verify-service.ts` (the atomic approve/reject transaction), `email.ts`,
  `meta-capi.ts`
- `src/lib/agency-admin` — the `/admin` agency admin's own logic: `env.ts` /
  `admin-auth.ts` (its own Basic Auth + rate limiting, entirely independent
  of the masterclass admin's), `authorize.ts` (the shared Basic-Auth-plus-
  origin-check every mutating Server Action calls first — leads, clients,
  and payments actions all reuse this one implementation), `origin.ts`
  (derives the expected request origin from `x-forwarded-host`/`host` +
  `x-forwarded-proto`, never from a fixed configured URL — see its own doc
  comment for why a fixed URL breaks on Preview deployments), `messages.ts`
  (shared action-result message strings, kept out of `actions.ts` files
  since a `"use server"` file may only export async functions),
  `validation.ts` / `clients-validation.ts` / `payments-validation.ts` (Zod
  schemas for filters, status, notes, ids, one file per domain),
  `timezone.ts` (Asia/Dhaka date-range math, including
  `lastNDhakaMonthKeys()` for the dashboard's 6-month revenue series),
  `billing.ts` (`nextBillingDateInDhaka()`), `money.ts` (the one shared
  `formatCents()`/`averageCents()`/`dollarsStringToCents()` — every money
  amount is an integer number of cents end to end; see its own doc comment
  and Money below), `leads-repository.ts` / `clients-repository.ts` /
  `payments-repository.ts` (Mongoose queries), `csv-core.ts` (shared BOM +
  formula-injection-safe CSV primitives) with `csv.ts` / `clients-csv.ts` /
  `payments-csv.ts` on top, `labels.ts` / `clients-labels.ts`, `query.ts`
- `src/components/public` — one component per homepage section, the shared
  `Logo`/`Container`/`Section`/`SectionHeading`/`Button` primitives, and
  `site-config.ts` (nav links, Calendly URL, contact email — see Brand below)
- `src/components/masterclass` — masterclass-only UI: its own
  `MasterclassHeader`/`MasterclassFooter`, the registration form, the
  Turnstile widget, evidence gallery, etc. — deliberately not `SiteHeader`/
  `SiteFooter`, to keep the sales page a single conversion path
- `src/assets/logos` — brand logo/favicon source files, imported into
  `Logo` via static `next/image` imports
- `src/assets/founder`, `src/assets/results` — the founder portrait and the
  two real campaign-evidence screenshots used on the homepage and `/results`

The agency site itself still has no `proxy.ts`/root `middleware.ts`, no
session/role guards, and no client dashboard, client authentication, or
self-serve ordering/checkout — do not reintroduce any of that for the agency
side; if a task seems to call for it, stop and confirm with the user first,
since removing that entire system was a deliberate, explicit decision. This
does **not** apply to the masterclass feature, which is a separate, already-
approved system: it has its own protected admin route (`/masterclass/admin`,
HTTP Basic Auth checked independently by the route layout and by every
mutating Server Action — see `src/lib/masterclass/admin-auth.ts`), its own
registration + manual-payment flow, and its own permanent Student records.
Do not treat the masterclass's registration/payment/admin/Student system as
something to remove or as evidence the agency-wide restriction is being
violated — it is intentional, current, active functionality. Equally, do not
claim or build a student portal, an automatic payment gateway, Programs/
Batches/Sessions, bulk email campaigns, or webinar/Zoom management for the
masterclass — none of that exists; it is explicitly out of scope unless
requested.

**Round 4A decision (agency leads admin at `/admin`).** The same "stop and
confirm first" rule above was deliberately invoked for this one: `/admin`
is a second, independent internal staff tool, in the same category as
`/masterclass/admin` — Basic Auth (its own `AGENCY_ADMIN_USER`/
`AGENCY_ADMIN_PASSWORD`/`AGENCY_ADMIN_RATE_LIMIT_SECRET`, never shared with
the masterclass admin's credentials), checked independently by
`src/proxy.ts`, by the `/admin` route layout, and by every mutating Server
Action and every CSV export route handler (see
`src/lib/agency-admin/admin-auth.ts`). It is explicitly **not** a revival of
the removed client-facing dashboard/account/self-serve-ordering system: no
client, prospect, or lead ever logs into it, and it doesn't touch the
masterclass's Student/payment-order data at all.
`tests/routes/masterclass-admin-isolation.test.ts` was updated accordingly —
it now asserts two independently-gated admin surfaces exist (separate
credentials, separate rate-limit scopes) rather than asserting only one may
exist, while still asserting neither `(public)/admin` nor `src/app/api/admin`
exists (see `tests/routes/removed-routes.test.ts`, unchanged).

**Round 4B (clients, payments, revenue).** Extended `/admin` with `Client`
and `Payment` records and real dashboard revenue figures, under the exact
same auth model as 4A — no new policy exception, since these are still
staff-only business records, not client accounts or a checkout flow. A
`Client` is created only two ways: converting a WON `Inquiry` (from that
lead's own detail page, which also enforces "never a duplicate client for
the same lead" — both in application logic and via a partial unique index
on `Client.sourceInquiryId`), or the standalone "Add client" form at
`/admin/clients/new` for a client who never came through a lead (referral,
LinkedIn, cold email). Every mutating Server Action across leads, clients,
and payments now shares one authorization implementation
(`src/lib/agency-admin/authorize.ts`) rather than three separate copies.
Payments are the one exception to the "notes are append-only" pattern the
rest of `/admin` uses — they can be edited and deleted (manual entry means
typos), with a `window.confirm()` step before delete; the underlying Server
Action still independently re-verifies auth/origin regardless of that
client-side confirmation. Bulk email/automation is out of scope until
Round 4C.

**Money.** Every amount anywhere under `/admin` is stored and handled as an
integer number of cents — never a float. `src/lib/agency-admin/money.ts` is
the one place a dollars-string form input becomes cents
(`dollarsStringToCents()`, via exact string splitting and `BigInt`, never
`Number(dollars) * 100` — that misrounds real values, e.g.
`19.99 * 100 === 1998.9999999999998` in JS) and the one place cents become a
display string (`formatCents()`). Sums (collected revenue, MRR) are plain
integer addition; an average (e.g. revenue per active client) is rounded
exactly once, at display time (`averageCents()`), never earlier. The
dashboard is careful to distinguish **collected** revenue (from actual
`Payment` records within the selected date range) from **MRR** (the sum of
`Client.monthlyAmountCents` across `ACTIVE` clients right now — committed
recurring revenue, not cash in hand) — the two are never the same number and
the UI labels them accordingly.

## Commands

```bash
npm run dev        # start dev server
npm run build       # production build
npm run start        # run the production build
npm run lint          # eslint
npm run typecheck      # tsc --noEmit
npm test                # vitest — schema/API/route tests, isolated mongodb-memory-server
```

Tests never touch the real `MONGODB_URI` — `.env.local` in this checkout
holds the **production** connection string (pulled via `vercel env pull`),
so every DB-backed test file imports `tests/helpers/mongodb-memory-server.ts`
first to point at an isolated in-memory instance instead. See that file's
own comment for why import order matters here.

## Brand

Outbound BD's visual system is ported from masumdev.com (the founder's own
site) — warm paper canvas, terracotta action color, serif Playfair Display
headings over a Poppins body face. Tokens are defined once in
`src/app/globals.css` (`canvas`, `canvas-alt`, `surface`, `accent`,
`accent-ink`, `action`, `action-hover`, `action-dark`, `ink`, `ink-muted`,
`hairline`, `on-dark`, `on-dark-muted` — see
`src/assets/logos/outbound-bd-color-palette.png` for swatches, hex/rgb, and
usage notes). The same file rethemes HeroUI's semantic CSS variables
(`--accent`, `--background`, `--border`, etc.) to this palette via an
unlayered `:root` override, so HeroUI primitives pick up brand colors
automatically — don't hardcode Tailwind's default gray/blue/slate palette,
and don't reintroduce the old navy/royal-blue palette.

Use the `Logo` component (`src/components/public/logo.tsx`) rather than
importing logo assets directly — `surface="canvas"|"dark"` picks the correct
asset for the background it's placed on, and `tone="brand"|"monochrome"`
switches to a flat single-color lockup. Every logo variant is a recolored
PNG (no SVG source exists for the mark) with `unoptimized` set so none of
them depend on Vercel's image-optimization quota.

Every "Book a ..." CTA site-wide reads `STRATEGY_CALL_HREF` /
`STRATEGY_CALL_LABEL` / `STRATEGY_CALL_LINK_PROPS` from
`src/components/public/site-config.ts` — that file's `CALENDLY_URL`
constant is the single place the real booking link lives. Never hardcode a
booking URL or CTA label anywhere else; if `CALENDLY_URL` is ever cleared it
correctly falls back to `/contact` instead of a placeholder/`#`.

## Conventions

- Server-only modules (`src/lib/env.ts`, `src/lib/mongoose.ts`,
  `src/lib/models/inquiry.ts`) must never be imported from a Client
  Component.
- HeroUI v3 has no `HeroUIProvider` and no `tailwind.config.js` — styling
  is wired entirely through `@import "tailwindcss"; @import "@heroui/styles";`
  in `src/app/globals.css`. Don't add either back in.
- Prefer `next/link` for navigation; use the shared `buttonClass`/`ButtonLink`
  from `src/components/public/button.tsx` for button-styled CTAs rather than
  raw `buttonVariants` calls, so tone/size stay consistent site-wide.
- No Express, no self-serve payments — the site is consultation-led;
  pricing shown anywhere is guidance, not a checkout flow.

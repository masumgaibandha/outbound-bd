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

A second, narrower exception, added in Round 4A: an internal, Basic-Auth-gated
staff tool at `/admin` for managing inbound leads (the agency's own
`Inquiry` documents) — dashboard, filterable/paginated leads list, lead
detail with a status pipeline and private notes, CSV export. This is **not**
the previously-removed client-facing dashboard/account/ordering system; it
has no client accounts, nothing a prospect or client ever logs into, and no
payment flow. See the note at the end of Architecture for how it relates to
`/masterclass/admin` and to the removed system.

## Stack

- **Framework**: Next.js 16 (App Router, React 19, React Compiler on)
- **Language**: TypeScript, strict mode
- **UI**: HeroUI v3 (`@heroui/react`, `@heroui/styles`) + Tailwind CSS v4
  (CSS-first config — there is no `tailwind.config.js`; theme and plugin
  wiring live in `src/app/globals.css`)
- **Data**: MongoDB via Mongoose for the agency's `Inquiry` collection; the
  masterclass feature uses the native `mongodb` driver's `Collection`/
  `ClientSession` API (via `src/lib/masterclass/db.ts`, reusing the same
  underlying Mongoose connection) for its own collections — see Masterclass
  below.
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
- `src/app/admin` — the Round 4A agency leads admin: dashboard, leads list,
  lead detail, CSV export (see the note at the end of this section)
- `src/app/sitemap.ts`, `src/app/robots.ts` — SEO metadata routes
- `src/lib` — `env.ts` (validated `MONGODB_URI`), `public-env.ts` (validated
  `NEXT_PUBLIC_APP_URL`), `mongoose.ts` (connection singleton),
  `inquiry-schema.ts` (Zod schema, shared by the form and the API route),
  `models/inquiry.ts` (Mongoose model), `contact-prefill.ts` (pure function
  resolving `?service=&plan=` query params into form prefill values),
  `pricing-catalog.ts` (managed-plan/one-time-offer data), `normalize-website.ts`
- `src/lib/masterclass` — registration/payment/admin logic: `env.ts` (the
  registration gate and all masterclass env accessors), `validation.ts`
  (Zod schemas), `turnstile.ts`, `rate-limit.ts`, `registrations-repository.ts`
  / `payment-orders-repository.ts` / `students-repository.ts`,
  `verify-service.ts` (the atomic approve/reject transaction), `email.ts`,
  `meta-capi.ts`
- `src/lib/agency-admin` — the `/admin` leads admin's own logic: `env.ts` /
  `admin-auth.ts` (its own Basic Auth + rate limiting, entirely independent
  of the masterclass admin's), `validation.ts` (Zod schemas for filters,
  status, notes, ids), `timezone.ts` (Asia/Dhaka date-range math),
  `leads-repository.ts` (Mongoose queries against `Inquiry`), `csv.ts`,
  `labels.ts`, `query.ts`
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
Action and the CSV export route handler (see
`src/lib/agency-admin/admin-auth.ts`). It manages the agency's own
`Inquiry` leads (status pipeline, private notes, CSV export, a dashboard) —
it is explicitly **not** a revival of the removed client-facing
dashboard/account/self-serve-ordering system: no client ever logs into it,
it has no payment flow, and it doesn't touch the masterclass's Student/
payment-order data at all. `tests/routes/masterclass-admin-isolation.test.ts`
was updated accordingly — it now asserts two independently-gated admin
surfaces exist (separate credentials, separate rate-limit scopes) rather
than asserting only one may exist, while still asserting neither
`(public)/admin` nor `src/app/api/admin` exists (see
`tests/routes/removed-routes.test.ts`, unchanged). Revenue, payments, and
client records are still out of scope for `/admin` until Round 4B; bulk
email/automation is out of scope until Round 4C.

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

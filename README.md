# Outbound BD

B2B lead generation and cold email outreach agency site. The agency side is
consultation-led — no client accounts, no client dashboard, no self-serve
checkout. Visitors either book a Calendly call or submit a project inquiry,
and every agency engagement is scoped and invoiced outside the website.

The one exception is the masterclass feature: a live, one-off paid
masterclass with its own registration flow, manual bKash/Nagad/Rocket/bank
payment verification (never an automatic payment gateway), and a small
protected admin surface for reviewing orders and managing enrolled Students.
See [Masterclass](#masterclass) below — it does not change the agency site's
own no-account, no-checkout model.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [MongoDB](https://www.mongodb.com) with [Mongoose](https://mongoosejs.com) — the agency's `Inquiry` collection, plus the masterclass's own collections (registrations, payment orders, Students) via the native driver
- [HeroUI](https://heroui.com) + Tailwind CSS v4
- npm

## Getting started

### 1. Prerequisites

- Node.js 20+
- A running MongoDB instance (local or [Atlas](https://www.mongodb.com/atlas))

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string, used by Mongoose |
| `NEXT_PUBLIC_APP_URL` | Public app URL — used for `metadataBase`, `sitemap.xml`, and `robots.txt` |

The masterclass feature has its own, larger set of environment variables
(registration gate, Turnstile, rate limiting, admin credentials, manual
payment method numbers/bank details, Resend, Meta) — see the rest of
`.env.example` for the full list and `src/lib/masterclass/env.ts` for how
each one is read. None of them are required for the agency site itself.

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Booking / Calendly

Every "Book a ..." CTA site-wide reads a single centralized href, label, and
link-safety props from `src/components/public/site-config.ts`
(`STRATEGY_CALL_HREF` / `STRATEGY_CALL_LABEL` / `STRATEGY_CALL_LINK_PROPS`).
To change the booking link, edit the `CALENDLY_URL` constant in that file —
nothing else needs to change. If it's ever cleared, every CTA safely falls
back to the `/contact` page instead of a broken link.

## Project structure

```
src/
  app/
    (public)/            the agency site — homepage, services, about,
                          founder, how-it-works, results, testimonials,
                          pricing, faq, contact, privacy-policy, terms
    masterclass/
      lead-generation-cold-email/  the masterclass sales page, its own
                                   layout/legal pages and OG image
      admin/                       protected admin: orders, students,
                                   enrollments (see Masterclass below)
    api/inquiries/         validates and persists contact-form submissions
    api/masterclass/          registration + payment-evidence submission
    sitemap.ts, robots.ts    SEO metadata routes
  components/
    public/                 one component per homepage section, plus the
                             shared Container/Section/SectionHeading/Button
                             primitives, Logo, site-config (nav + Calendly)
    masterclass/               masterclass-only UI (its own header/footer,
                                registration form, Turnstile widget, etc.)
  lib/
    env.ts                    validated MONGODB_URI
    public-env.ts               validated NEXT_PUBLIC_APP_URL
    mongoose.ts                   Mongoose connection singleton
    inquiry-schema.ts               Zod schema shared by the form + API route
    models/inquiry.ts                 Mongoose model
    contact-prefill.ts                  resolves ?service=&plan= query params
    pricing-catalog.ts                    managed-plan / one-time-offer data
    masterclass/                          registration/payment/admin logic —
                                           env gating, validation, Turnstile,
                                           rate limiting, repositories, email
  assets/
    logos/                    brand logo + favicon source PNGs
    founder/                    founder portrait
    results/                      real campaign-evidence screenshots
```

The agency site itself has no authentication, no client dashboard, and no
self-serve ordering/checkout — that was a deliberate decision; do not
reintroduce it without an explicit request. The masterclass admin surface
(`/masterclass/admin/**`) is a separate, small, Basic-Auth-protected area for
reviewing manual payment evidence and managing enrolled Students — it is not
a general client dashboard and does not imply one is coming. There is still
no `proxy.ts`/root `middleware.ts`.

## Masterclass

A one-off, currently live masterclass with its own registration and manual
payment flow, entirely separate from the agency's consultation-led model:

- **Registration**: name/email/phone + Cloudflare Turnstile, gated behind a
  single `MASTERCLASS_REGISTRATION_ENABLED` flag (see
  `src/lib/masterclass/env.ts`) that also controls the sales page's
  indexing, its announcement banner, and the registration form itself.
- **Payment**: manual bKash, Nagad, Rocket, or bank transfer only — a
  registrant submits their own transaction ID as evidence; there is no
  automatic payment gateway integration.
- **Admin**: `/masterclass/admin/**` (orders, students, enrollments) is
  protected by HTTP Basic Auth, checked independently by both the route
  layout and every mutating Server Action.
- **Students**: a permanent Student record is created (or reused) only when
  an operator approves a payment order, inside one atomic transaction that
  also marks the order PAID and the registration ENROLLED.

Not implemented: Programs/Batches/Sessions, a student portal, an automatic
payment gateway, bulk email campaigns, or webinar/Zoom management.

## Brand

The visual system is ported from masumdev.com's own design (warm cream
canvas, terracotta action color, Playfair Display + Poppins). All 13 color
tokens live in `src/app/globals.css` and are documented with hex/rgb/usage
notes in `src/assets/logos/outbound-bd-color-palette.png`. Always go through
the `Logo` component (`src/components/public/logo.tsx`) rather than
importing a logo asset directly.

## Scripts

```bash
npm run dev         # start the dev server
npm run build         # production build
npm run start           # run the production build
npm run lint               # eslint
npm run typecheck            # tsc --noEmit
npm test                       # vitest — schema/API/route tests
```

### Testing

Tests run against an isolated, in-memory MongoDB (via `mongodb-memory-server`)
— never against `MONGODB_URI`. This is deliberate: `.env.local` in a
Vercel-linked checkout typically holds the **production** database
connection string (pulled via `vercel env pull`), so tests must never read
it. See `vitest.config.mts` and `tests/helpers/mongodb-memory-server.ts`.

## Notes

- No Express (Next.js route handlers are the backend). The agency side has
  no payments — pricing shown there is guidance, not a checkout flow. The
  masterclass is the one exception, and even there payment is manual
  (bKash/Nagad/Rocket/bank transfer with operator verification), never an
  automatic gateway charge.
- HeroUI v3 requires no `HeroUIProvider` and no `tailwind.config.js`; its
  theme is wired entirely through `@import "tailwindcss"; @import "@heroui/styles";`
  in `src/app/globals.css`.

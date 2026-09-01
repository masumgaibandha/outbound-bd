# Outbound BD

B2B lead generation and cold email outreach agency site. Consultation-led —
no accounts, no dashboards, no self-serve checkout. Visitors either book a
Calendly call or submit a project inquiry, and every engagement is scoped
and invoiced outside the website.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [MongoDB](https://www.mongodb.com) with [Mongoose](https://mongoosejs.com) — one collection, `Inquiry`
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
    (public)/            the entire site — homepage, services, about,
                          founder, how-it-works, results, testimonials,
                          pricing, faq, contact, privacy-policy, terms
    api/inquiries/         validates and persists contact-form submissions
    sitemap.ts, robots.ts    SEO metadata routes
  components/
    public/                 one component per homepage section, plus the
                             shared Container/Section/SectionHeading/Button
                             primitives, Logo, site-config (nav + Calendly)
  lib/
    env.ts                    validated MONGODB_URI
    public-env.ts               validated NEXT_PUBLIC_APP_URL
    mongoose.ts                   Mongoose connection singleton
    inquiry-schema.ts               Zod schema shared by the form + API route
    models/inquiry.ts                 Mongoose model
    contact-prefill.ts                  resolves ?service=&plan= query params
    pricing-catalog.ts                    managed-plan / one-time-offer data
  assets/
    logos/                    brand logo + favicon source PNGs
    founder/                    founder portrait
    results/                      real campaign-evidence screenshots
```

There is no authentication, no dashboards, and no `proxy.ts`/`middleware.ts`
— the entire site is public. Do not reintroduce any of that without an
explicit request; removing it was a deliberate decision.

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

- No Express (Next.js route handlers are the backend) and no payments —
  the site is consultation-led; pricing shown anywhere is guidance, not a
  checkout flow.
- HeroUI v3 requires no `HeroUIProvider` and no `tailwind.config.js`; its
  theme is wired entirely through `@import "tailwindcss"; @import "@heroui/styles";`
  in `src/app/globals.css`.

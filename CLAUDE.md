@AGENTS.md

# Outbound BD

B2B lead generation and cold email outreach agency site. Next.js App Router,
TypeScript, MongoDB via Mongoose, HeroUI + Tailwind CSS, npm. Consultation-led
— there is no authentication, no user accounts, no dashboards, and no
self-serve ordering or payment flow. Every conversion path ends at a Calendly
booking link or the contact form; agreements and invoicing happen outside the
website.

## Stack

- **Framework**: Next.js 16 (App Router, React 19, React Compiler on)
- **Language**: TypeScript, strict mode
- **UI**: HeroUI v3 (`@heroui/react`, `@heroui/styles`) + Tailwind CSS v4
  (CSS-first config — there is no `tailwind.config.js`; theme and plugin
  wiring live in `src/app/globals.css`)
- **Data**: MongoDB via Mongoose only (no native `mongodb` driver dependency
  — it's present in `node_modules` solely as Mongoose's own transitive
  dependency). One collection, `Inquiry`, backs the contact form.
- **Package manager**: npm

## Architecture

`src`-based layout. There is exactly one route group — the whole site is
public:

- `src/app/(public)` — the marketing site: homepage, `/services` index + 4
  service detail pages, `/about`, `/about/founder`, `/how-it-works`,
  `/results`, `/testimonials`, `/pricing`, `/faq`, `/contact`,
  `/privacy-policy`, `/terms-of-service`
- `src/app/api/inquiries` — the only API route; validates and persists
  contact-form submissions
- `src/app/sitemap.ts`, `src/app/robots.ts` — SEO metadata routes
- `src/lib` — `env.ts` (validated `MONGODB_URI`), `public-env.ts` (validated
  `NEXT_PUBLIC_APP_URL`), `mongoose.ts` (connection singleton),
  `inquiry-schema.ts` (Zod schema, shared by the form and the API route),
  `models/inquiry.ts` (Mongoose model), `contact-prefill.ts` (pure function
  resolving `?service=&plan=` query params into form prefill values),
  `pricing-catalog.ts` (managed-plan/one-time-offer data), `normalize-website.ts`
- `src/components/public` — one component per homepage section, the shared
  `Logo`/`Container`/`Section`/`SectionHeading`/`Button` primitives, and
  `site-config.ts` (nav links, Calendly URL, contact email — see Brand below)
- `src/assets/logos` — brand logo/favicon source files, imported into
  `Logo` via static `next/image` imports
- `src/assets/founder`, `src/assets/results` — the founder portrait and the
  two real campaign-evidence screenshots used on the homepage and `/results`

There is no `proxy.ts`/`middleware.ts`, no session/role guards, and no
protected route group — none of that exists in this app. Do not reintroduce
auth, dashboards, ordering, or payment functionality; if a task seems to
call for one of those, stop and confirm with the user first, since removing
that entire system was a deliberate, explicit decision.

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

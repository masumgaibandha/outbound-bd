@AGENTS.md

# Outbound BD

B2B lead generation and cold email outreach agency app. Next.js App Router,
TypeScript, MongoDB via Mongoose, HeroUI + Tailwind CSS, Better Auth, npm.

## Stack

- **Framework**: Next.js 16 (App Router, React 19, React Compiler on)
- **Language**: TypeScript, strict mode
- **UI**: HeroUI v3 (`@heroui/react`, `@heroui/styles`) + Tailwind CSS v4
  (CSS-first config — there is no `tailwind.config.js`; theme and plugin
  wiring live in `src/app/globals.css`)
- **Auth**: Better Auth, email/password, MongoDB adapter (native `mongodb`
  driver)
- **Data**: MongoDB. Better Auth owns its own collections (`user`,
  `session`, `account`, `verification`) via the native driver; application
  domain models should be defined with Mongoose against the same database.
- **Package manager**: npm

## Architecture

`src`-based layout with route groups:

- `src/app/(public)` — marketing site shell (header + footer) and the full
  homepage (hero, services, process, results, tools, why-us, FAQ, final CTA)
- `src/app/(auth)` — centered auth layout, `/sign-in`, `/sign-up`
- `src/app/(client-dashboard)` — `/dashboard/*`, any authenticated user
- `src/app/(admin-dashboard)` — `/admin/*`, `ADMIN` role only
- `src/app/api/auth/[...all]` — Better Auth's catch-all route handler
- `src/lib` — `auth.ts` (server auth instance), `auth-client.ts` (React
  client), `session.ts` (server-side role guards), `mongodb.ts` (native
  driver singleton, used by the auth adapter), `mongoose.ts` (Mongoose
  connection singleton, for app models), `env.ts` (validated env vars),
  `roles.ts` (the `Role` type)
- `src/components` — `public/` (header, footer, logo, and one component per
  homepage section — see below), `auth/` (sign-in/up forms), `dashboard/`
  (shared `DashboardShell`, nav, placeholders)
- `src/assets/logos` — brand logo/favicon source files, imported into
  components via static `next/image` imports (see `components/public/logo.tsx`)
- `src/proxy.ts` — optimistic, cookie-presence-only redirect for
  `/dashboard/*` and `/admin/*`. Not the security boundary. (Next.js 16
  renamed the `middleware.ts` convention to `proxy.ts`.)

## Roles and authorization

Two roles: `ADMIN` and `CLIENT` (see `src/lib/roles.ts`). New sign-ups
always default to `CLIENT` — the `role` field is `input: false` on the
Better Auth user schema, so it can never be set from client-supplied
sign-up/update payloads. Promote a user to `ADMIN` directly in the
database (or build an internal admin-only endpoint that uses
`auth.api` — never trust a client-submitted role).

**Security model**: `src/proxy.ts` only checks whether a session
cookie is present, purely for redirect UX — it does not verify the
session or role. The actual authorization boundary is
`requireUser` / `requireRole` in `src/lib/session.ts`, called at the top
of each dashboard route group's `layout.tsx` (server components), which
re-verifies the session against the database on every request. Any new
protected route group must call one of these at the top of its layout.

## Commands

```bash
npm run dev        # start dev server
npm run build       # production build
npm run start        # run the production build
npm run lint          # eslint
npm run typecheck      # tsc --noEmit
```

## Brand

Outbound BD's palette is a fixed 7-color set, defined once as Tailwind
theme tokens in `src/app/globals.css` (`canvas`, `ink`, `subtext`,
`hairline`, `navy`, `royal`, `azure` — see `src/assets/logos/outbound-bd-color-palette.png`
for usage guidance). The same file rethemes HeroUI's semantic CSS
variables (`--accent`, `--background`, `--border`, etc.) to this palette
via an unlayered `:root` override, so HeroUI primitives (e.g. `Button`)
pick up brand colors automatically — don't hardcode Tailwind's default
gray/blue/slate palette in new marketing UI. Use the `Logo` component
(`src/components/public/logo.tsx`) rather than importing logo assets
directly — it picks the correct light/navy asset for the background it's
placed on.

## Conventions

- Server-only modules (`src/lib/auth.ts`, `src/lib/session.ts`,
  `src/lib/mongodb.ts`, `src/lib/mongoose.ts`) must never be imported from
  a Client Component.
- HeroUI v3 has no `HeroUIProvider` and no `tailwind.config.js` — styling
  is wired entirely through `@import "@heroui/styles";` in
  `src/app/globals.css`. Don't add either back in.
- Prefer `next/link` for navigation; use HeroUI's exported
  `buttonVariants`/`linkVariants` (from `@heroui/styles`) as `className`
  on it for consistent styling, rather than HeroUI's own `Link` primitive,
  which isn't wired to the Next.js router.
- No Express, no payments — out of scope for this stage.

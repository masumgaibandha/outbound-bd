# Outbound BD

B2B lead generation and cold email outreach agency platform.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [MongoDB](https://www.mongodb.com) with [Mongoose](https://mongoosejs.com)
- [HeroUI](https://heroui.com) + Tailwind CSS
- [Better Auth](https://better-auth.com) (email/password, MongoDB adapter)
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
| `MONGODB_URI` | MongoDB connection string, used by both Better Auth and Mongoose |
| `BETTER_AUTH_SECRET` | Random secret used to sign sessions. Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | The base URL Better Auth runs on (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | Public app URL, used by the browser auth client |

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Roles

There are two roles: `ADMIN` and `CLIENT`.

- New sign-ups always default to `CLIENT`. The client can never set its
  own role — it's a server-only field on the Better Auth user schema.
- To promote a user to `ADMIN`, update their user document's `role`
  field directly in MongoDB:

  ```js
  db.user.updateOne({ email: "you@example.com" }, { $set: { role: "ADMIN" } })
  ```

- `/dashboard/*` is available to any signed-in user.
- `/admin/*` is available to `ADMIN` users only. Signed-in non-admins are
  redirected to `/dashboard`; signed-out visitors are redirected to
  `/sign-in`.

Route protection is enforced server-side (in each dashboard route group's
`layout.tsx`, via `requireUser` / `requireRole` in `src/lib/session.ts`),
re-checked against the database on every request. `src/proxy.ts` only
does a lightweight cookie-presence redirect for UX and is not the security
boundary.

## Project structure

```
src/
  app/
    (public)/            marketing site — header, footer, landing page
    (auth)/               sign-in / sign-up
    (client-dashboard)/    /dashboard/* — any authenticated user
    (admin-dashboard)/      /admin/* — ADMIN only
    api/auth/[...all]/       Better Auth route handler
  components/
    public/                header, footer
    auth/                    sign-in / sign-up forms
    dashboard/                shared dashboard shell, nav, placeholders
  lib/
    auth.ts                 Better Auth server instance
    auth-client.ts            Better Auth React client
    session.ts                 server-side session/role guards
    mongodb.ts                   native MongoDB client (used by the auth adapter)
    mongoose.ts                    Mongoose connection singleton (for app models)
    env.ts                          validated environment variables
    roles.ts                         the Role type ("ADMIN" | "CLIENT")
  proxy.ts
```

## Scripts

```bash
npm run dev         # start the dev server
npm run build         # production build
npm run start           # run the production build
npm run lint               # eslint
npm run typecheck            # tsc --noEmit
```

## Notes

- This scaffold intentionally does not include Express (Next.js API/route
  handlers are the backend) or payments — both are out of scope for this
  stage.
- HeroUI v3 requires no `HeroUIProvider` and no `tailwind.config.js`; its
  theme is wired entirely through `@import "@heroui/styles";` in
  `src/app/globals.css`.

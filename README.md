# Meow AI

A friendly AI chat assistant with a cat theme, built with Next.js.

## Features

- AI-powered chat with streaming responses
- Single-password sign-in with cloud-synced conversations
- Voice input (speech recognition)
- Read aloud (text-to-speech) on responses
- Live mode for automatic voice responses
- Web search for real-time data (DuckDuckGo)
- File uploads (text and code)
- Admin screen for reviewing every conversation
- Code syntax highlighting
- Free AI models with cat names
- Mobile-responsive design

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS 3
- **Auth:** one shared secret, verified server-side, issued as a `jose` session cookie
- **Database:** PostgreSQL via Prisma (Supabase or any Postgres host)
- **Deployment:** Render

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your keys
3. Run `npm install`
4. Run `npm run dev`

## Environment Variables

```
# Postgres (Prisma) — schema lives in prisma/schema.prisma
DATABASE_URL=
DIRECT_URL=

# Session — 32+ random chars, signs the session JWT
SESSION_SECRET=

# Sign-in — the single shared password. Generate one with `npm run secret`.
MEOW_LOGIN_SECRET=

# Optional identity carried by the session cookie. Chat history is keyed off
# this address; defaults to the first entry of MEOW_AI_ADMIN_EMAILS.
MEOW_LOGIN_EMAIL=
MEOW_LOGIN_NAME=

MEOW_AI_API_KEY=
MEOW_AI_API_URL=

# Comma-separated. Required to reach /admin.
MEOW_AI_ADMIN_EMAILS=
```

### Sign-in

This app is used by one person, so it has no accounts to create and no
identity provider to configure. Sign-in proves knowledge of one secret:

1. `npm run secret` prints a strong passphrase and, underneath it, an
   `scrypt$…` value. Either can go in `MEOW_LOGIN_SECRET`; the `scrypt$…` form
   means a leaked environment variable only exposes a slow-hash target.
2. Set `MEOW_LOGIN_SECRET` in Render (or `.env.local`), plus
   `MEOW_LOGIN_EMAIL` and `SESSION_SECRET` if you have not set them already.
3. To rotate the password, generate a new value and update the variable.
   Nothing else needs to change.

Signing in touches no database and makes no external request, so the login
page keeps working even if Postgres is paused or the provider is down. Every
API route still verifies the session cookie server-side on each request, and
`/admin` additionally requires the email to be listed in `MEOW_AI_ADMIN_EMAILS`.

### Choosing models

`lib/types.ts` lists one cat per model. Every id there must exist on the
provider's live model list — an id the provider has retired returns 404/410
and wastes a fallback attempt. Check them before shipping:

```bash
curl -s https://opencode.ai/zen/v1/models -H "Authorization: Bearer $MEOW_AI_API_KEY"
```

The fallback chain in `app/api/chat/route.ts` is derived from that same list,
so adding or removing a cat automatically adds or removes it from the retry
order.

### Applying the schema

A brand-new Postgres host starts empty. Run this once against it:

```bash
DATABASE_URL="<connection-uri>" npm run db:push
```

## Author

Created by **Siva**

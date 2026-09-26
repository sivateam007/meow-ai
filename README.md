# Meow AI

A friendly AI chat assistant with a cat theme, built with Next.js.

## Features

- AI-powered chat with streaming responses
- Google sign-in with cloud-synced conversations
- Voice input (speech recognition)
- Read aloud (text-to-speech) on responses
- Live mode for automatic voice responses
- Web search for real-time data (DuckDuckGo)
- File uploads (text and code)
- Invite-only access with admin approval
- Code syntax highlighting
- 7 free AI models with cat names
- Mobile-responsive design

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS 3
- **Auth:** Supabase Auth (email + password) + a `jose` session cookie
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

# Supabase — browser SDK (public values, safe to expose)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase — server side. Optional: only the anon key is needed to verify a
# token. Add the service role key if you later need admin operations
# (listing users, creating accounts without email confirmation).
SUPABASE_SERVICE_ROLE_KEY=

# Session
SESSION_SECRET=           # 32+ random chars, signs the session JWT

MEOW_AI_API_KEY=
MEOW_AI_API_URL=
MEOW_AI_ADMIN_EMAILS=   # comma-separated admin emails (required to access /admin)
MEOW_AI_ALLOWED_EMAILS= # optional comma-separated allowlist; unset = invite-only via admin grants
```

### Supabase setup

1. **Project Settings → Data API** → copy the **Project URL** and the
   **publishable / anon key** into `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Copy the **service role** key into
   `SUPABASE_SERVICE_ROLE_KEY` (optional).
2. **Authentication → Providers → Email** → enable **Email** with
   "Confirm email" turned **off**, so new accounts can sign in immediately.
3. **Authentication → Users → Add user** → create the first account, set a
   password, and tick **Auto Confirm User**.

That is the whole setup. There is no OAuth client, no authorized-domain list and
no test-user list to maintain — one service handles both auth and the database.

The browser SDK is only used to exchange an email + password for an access
token. All data access goes through our own API routes, and the session is a
`jose`-signed httpOnly cookie that edge middleware can verify without a database
round-trip. Revocation is still enforced per-request against the `AppUser`
table.

### Applying the schema

A brand-new Postgres host starts empty. Run this once against it:

```bash
DATABASE_URL="<direct-uri>" npx prisma db push
```

## Author

Created by **Siva**

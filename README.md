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
- **Auth:** Firebase Authentication (Google provider) + a `jose` session cookie
- **Database:** PostgreSQL via Prisma
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

# Firebase Auth — server side (verify ID tokens, set the session cookie)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=     # paste the JSON's private_key value; \n escapes are fine
SESSION_SECRET=           # 32+ random chars, signs the session JWT

# Firebase Auth — client side (public config, not a secret)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

MEOW_AI_API_KEY=
MEOW_AI_API_URL=
MEOW_AI_ADMIN_EMAILS=   # comma-separated admin emails (required to access /admin)
MEOW_AI_ALLOWED_EMAILS= # optional comma-separated allowlist; unset = invite-only via admin grants
```

### Firebase console setup

1. **Authentication → Sign-in method** → enable **Google**
2. **Authentication → Settings → Authorized domains** → add your production domain
   (e.g. `www.meowai.work.gd`). Without this, sign-in fails with
   `auth/unauthorized-domain`.
3. **Project settings → Service accounts → Generate new private key** → JSON

The browser SDK is only used to obtain a Google ID token. All data access goes
through our own API routes, and the session is a `jose`-signed httpOnly cookie
that edge middleware can verify without a database round-trip. Revocation is
still enforced per-request against the `AppUser` table.

### Applying the schema

A brand-new Postgres host starts empty. Run this once against it:

```bash
DATABASE_URL="<direct-uri>" npx prisma db push
```

## Author

Created by **Siva**

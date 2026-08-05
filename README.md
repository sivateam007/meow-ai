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
- **Auth:** NextAuth v5 (Google provider)
- **Database:** Supabase PostgreSQL
- **Deployment:** Render

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your keys
3. Run `npm install`
4. Run `npm run dev`

## Environment Variables

```
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=
DATABASE_URL=
OPENCODE_API_KEY=
MEOW_AI_ADMIN_EMAILS=   # comma-separated admin emails (required to access /admin)
MEOW_AI_ALLOWED_EMAILS= # optional comma-separated allowlist; unset = invite-only via admin grants
```

## Author

Created by **Siva**

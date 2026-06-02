# TJR Lead Tracker

Single-page lead identity and journey tracker. Cross-identifies users from the **tjr_mm6** Postgres database by stitching Hyros opt-ins, attributed sales, calls, CRM records, Whop memberships, and shared IP signals.

## Stack

- Next.js 15 (App Router)
- PostgreSQL (`tjr_mm6`)
- Tailwind CSS 4

## Local dev

```bash
cp .env.example .env.local
# fill in DATABASE_URL
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and search by email, phone, or name.

## API

| Endpoint | Description |
|---|---|
| `GET /api/journey?q=email@example.com` | Full stitched user journey |
| `GET /api/search?q=partial` | Autocomplete suggestions |

## Deploy

Designed for Vercel. Set `DATABASE_URL` in project env vars.

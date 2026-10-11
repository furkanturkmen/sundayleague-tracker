# Sunday League Tracker

A club tracker for Sunday league sides. Pick your club on the landing page, or create one, then log the squad and every result. Stats, records, analysis and the Hall of Fame and Hall of Shame are all worked out from the results.

## Features

| Page | What's on it |
| --- | --- |
| Landing (`/`) | Choose a club, jump back to clubs you've viewed, or create a new one |
| Home (`/c/<club>`) | Season record, next fixture, form, latest results, top scorers and assists |
| Players | Squad table sortable by any column and filterable by season, plus a profile per player |
| Matches | Fixtures and results by season, with goals, assists, cards, Man of the Match and squad per match |
| Records | Biggest wins and defeats, streaks, individual records, season-by-season, head to head |
| Analysis | Goals by month, when goals go in, home vs away, competitions, partnerships, with/without each player |
| Fame & Shame | Awards from Golden Boot to Card Collector, plus your own stories for each hall |
| Settings | Club name, badge text and colours, squad, moments, admin password |

Anyone with the link can view a club. Editing needs the club's admin password, which is set when the club is created.

## Running locally

You need Node 20+ and a Postgres database.

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL
npm run dev
```

Open http://localhost:3000. The tables are created automatically the first time the app connects, so there's no migration step.

## Environment variables

| Name | Required | What it's for |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. `POSTGRES_URL` also works. |
| `SESSION_SECRET` | Recommended | Signs admin sign-in cookies. Any long random string. |

## Deploying to Vercel

1. Import the repo in Vercel.
2. Add a Postgres database from the Vercel Marketplace (Neon or Supabase). That sets `DATABASE_URL` or `POSTGRES_URL` for you.
3. Add `SESSION_SECRET` under Settings → Environment Variables.
4. Deploy, open the site and create your club.

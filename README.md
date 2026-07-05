# Aura A&R Research Tool (V1)

A local-first tool to find and evaluate independent artists for A&R. V1 proves the
workflow with **manual data entry + a daily scoring job** no scraping yet.

## Stack

- **Next.js 15** (App Router, TypeScript) pages + Server Actions (no separate REST layer)
- **Prisma + SQLite** local DB at `prisma/dev.db`
- **Tailwind CSS** dark UI
- **Recharts** growth + score charts
- **tsx** runs the daily job / seed / scripts

## Setup

```bash
npm install
npm run setup   # prisma generate + db push + seed sample data
npm run dev     # http://localhost:3000
```

> **Corporate network note:** if `prisma generate` fails with a self-signed
> certificate error, prefix Prisma commands with the system CA store:
> ```bash
> # PowerShell
> $env:NODE_OPTIONS="--use-system-ca"; npx prisma generate
> ```
> This machine needs it; `npm run build`/`dev` may also need it set.

## Spotify (real data)

The app pulls **real** Spotify data via the official Web API: followers, popularity,
genres, and top tracks. Monthly listeners and stream counts are **not** available
from the API, so those remain manual entry.

1. Create a free app at https://developer.spotify.com/dashboard and copy the
   **Client ID** and **Client Secret**.
2. Put them in `.env`:
   ```
   SPOTIFY_CLIENT_ID="..."
   SPOTIFY_CLIENT_SECRET="..."
   ```
3. Verify: `npm run test:spotify` (add `-- <artist url>` to test a specific artist).
4. In the app, an artist with a Spotify link shows a **Refresh from Spotify** button.
   The daily job also refreshes every Spotify-linked artist automatically.

> **Corporate network:** the API calls go out over HTTPS. If they fail with a
> self-signed certificate error, run with the system CA store, e.g.
> `$env:NODE_OPTIONS="--use-system-ca"; npm run daily` (PowerShell).

TikTok/Instagram scraping is intentionally **not** built here — it will live in a
separate dedicated tool that plugs into the same `scrapers/` interface.

## Daily workflow (run once a day for the week)

1. **Add leads** `/artists/new` (or `npm run import:csv -- leads.csv`).
2. **Enter today's metrics** on each artist profile (Spotify / TikTok / Instagram).
3. **Run scoring** `npm run daily` (or click *Recalculate all* on the dashboard).
4. **Review** the Priority Chart and Alerts on `/`.
5. **Back up** `npm run backup` copies the DB into `/backups`.

`npm run daily` recalculates every artist's score, generates alerts (daily
performing tracks, score spikes, first-time rising, stale), and prints a summary.

## Pages

- `/` Priority Chart (score ≥ 60), status counts, alerts, newest leads
- `/artists` searchable/filterable database
- `/artists/new` manual add form
- `/artists/[id]` full research profile: score breakdown, charts, metric entry, links, contacts, notes, signals
- `/daily-review` who still needs today's metrics vs. who's done

## Scoring (transparent, rules-based see `lib/scoring.ts`)

`total = spotify*0.45 + tiktok*0.35 + instagram*0.15 + signal*0.05`, each sub-score 0–100.
Thresholds live in `lib/constants.ts`. Tune freely ML comes later.

## Design decisions / deviations from the original spec

- **Server Actions instead of a REST API layer** same CRUD, far less code.
- **Enums are `String` columns** SQLite has no native enums via Prisma. Allowed
  values are validated against arrays in `lib/constants.ts`.
- **Added `@@unique` constraints** on `MetricSnapshot`, `TrackSnapshot`, `DailyScore`
  so re-running the daily job upserts instead of duplicating rows (critical for
  day-over-day math). Snapshots are keyed to **start-of-UTC-day**.
- **Dropped `slug`** `id`-based routing is enough for a local tool.
- **Stale artists are flagged, not auto-disabled** (per the spec's week-1 guidance).

## Project structure

```
app/            pages + actions.ts (server actions)
components/     badges, charts, forms (client components)
lib/            prisma, scoring, engine, classifiers, constants, date
jobs/           dailyRun.ts (the daily job)
scrapers/       mock.ts (placeholder interface no real scraping in V1)
scripts/        importCsv.ts, backupDb.ts
prisma/         schema.prisma, seed.ts, dev.db
```

## What to build next

1. Real scrapers/APIs behind the `scrapers/` interface (Spotify API first cleanest).
2. Email/notification delivery for alerts (currently in-app only).
3. Calendar view of past-day Priority Charts (data already stored in `DailyScore`).
4. AI: artist-history summary, growth-driver detection, recommended action.
5. Auth + move SQLite → Postgres/Supabase for cloud + scheduled jobs.
6. CSV columns: `artist_name,spotify_url,tiktok_url,instagram_url,youtube_url,genre,location,status,notes,source`.

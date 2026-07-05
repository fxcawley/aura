# Changelog

This file records what changed and when, in plain language. Newest entries go at
the top. If you are not a coder: think of this as the tool's "release notes" — a
running history so anyone (including your Codex agent) can catch up quickly.

How to read a version number like `0.2.0`:
- The **middle** number (`2`) goes up when we add a new feature.
- The **last** number (`0`) goes up when we only fix small things.
- The **first** number (`0`) stays `0` until the tool is considered "finished
  enough" for a real 1.0 launch.

---

## [0.2.0] - 2026-07-05 — Real Spotify data

### Added
- **Live Spotify connection.** The tool can now pull *real* numbers from Spotify
  instead of made-up sample data: an artist's follower count, popularity score
  (0–100), genres, and their current top tracks.
- **"Refresh from Spotify" button** on each artist's profile page. Click it and
  the tool goes to Spotify, grabs the latest numbers, and updates that artist.
- **Automatic refresh** during the daily job (`npm run daily`) for every artist
  that has a Spotify link saved.
- **Auto-fill on add.** If you paste a Spotify link when adding a new artist, the
  tool immediately pulls their Spotify data.
- **`npm run test:spotify`** — a quick check to confirm your Spotify keys work.
- `.env.example` file showing which secret keys the tool needs.

### Notes / limitations (important)
- Spotify's official connection does **not** share **monthly listeners** or
  **exact stream counts**. Those still have to be typed in by hand. Everything
  else on Spotify is now automatic.
- TikTok and Instagram are **not** connected yet. That is intentional — real
  TikTok/IG data will come from a **separate tool** later (see TODOs). For now,
  enter those numbers manually.

### Setup you need to do once
- Make a free Spotify developer app, then paste its two keys into the `.env` file
  (`SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`). Full steps are in `README.md`.

---

## [0.1.1] - 2026-07-05 — Bug fix: buttons weren't working

### Fixed
- Buttons like **Recalculate** were failing with an "Application error" message.
  Cause: the app blocks button actions when the web address doesn't match what
  it expects. Fixed the settings so buttons work when you open the app directly
  at **http://localhost:3001**.
- **Tip:** open the app in your normal web browser at `http://localhost:3001`,
  not inside the code editor's little preview window. Buttons only work reliably
  in a real browser tab.

---

## [0.1.0] - 2026-07-05 — First working version (MVP)

### Added
- The whole starter app: a dashboard, an artist database, an "add artist" form,
  and a detailed profile page for each artist.
- **Priority Chart** — artists sorted by score, highest first. Only artists
  scoring 60 or above show here; everyone else is still saved in the database.
- **Manual data entry** — type in each artist's daily Spotify / TikTok / Instagram
  numbers on their profile.
- **Automatic scoring** — a transparent, rules-based score (no AI yet) that you
  can read and adjust. It combines Spotify, TikTok, Instagram, and "signals"
  (like playlist adds) into one 0–100 priority score.
- **Alerts** — the tool flags things worth your attention: a track suddenly
  performing, a big score jump, an artist crossing the priority line for the
  first time, or an artist going quiet for too long.
- **Daily Review page** — shows who still needs today's numbers entered.
- **Sample data** — three example artists with a week of history so the charts
  aren't empty on day one.
- **Daily job** (`npm run daily`) — recalculates all scores and generates alerts.
- **Backups** (`npm run backup`) and **CSV import** (`npm run import:csv`).

### Known limitations
- No real scraping yet (that arrived in 0.2.0 for Spotify).
- Runs only on your own computer. No login, no cloud, single user.

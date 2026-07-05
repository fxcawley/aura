// Daily operating job. Run once per day: npm run daily
// 1) Recalculate all artist scores for today
// 2) Alerts are generated inside recalc (daily performing tracks, spikes, rising)
// 3) Mark stale artists (below threshold for 30 consecutive days)
// 4) Print a summary
import { PrismaClient } from "@prisma/client";
import { startOfUtcDay, addDays } from "../lib/date";
import { recalcAll } from "../lib/engine";
import { PRIORITY_CHART_MIN } from "../lib/constants";
import { isSpotifyConfigured } from "../lib/spotify";
import { refreshArtistFromSpotify } from "../lib/refreshSpotify";

const prisma = new PrismaClient();

// Pull real Spotify data for every artist that has a Spotify link.
async function refreshSpotifyAll(): Promise<{ updated: number; failed: number }> {
  if (!isSpotifyConfigured()) {
    console.log("Spotify not configured — skipping API refresh (manual metrics only).");
    return { updated: 0, failed: 0 };
  }
  const linked = await prisma.artistLink.findMany({
    where: { platform: "SPOTIFY", artist: { status: { not: "ARCHIVED" } } },
    select: { artistId: true },
    distinct: ["artistId"],
  });
  let updated = 0;
  let failed = 0;
  for (const { artistId } of linked) {
    try {
      const r = await refreshArtistFromSpotify(artistId);
      if (r.ok) updated++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { updated, failed };
}

async function markStale(day: Date) {
  const artists = await prisma.artist.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: {
      scores: {
        where: { scoreDate: { gte: addDays(day, -29) } },
        orderBy: { scoreDate: "asc" },
      },
    },
  });

  const stale: string[] = [];
  for (const a of artists) {
    // need at least 30 days of history AND none reached threshold
    if (a.scores.length >= 30 && a.scores.every((s) => s.totalScore < PRIORITY_CHART_MIN)) {
      stale.push(a.name);
      // V1: flag only, do not auto-disable collection.
      await prisma.alert.create({
        data: {
          artistId: a.id,
          type: "STALE_ARTIST",
          title: `Stale ${a.name}`,
          message: `Below ${PRIORITY_CHART_MIN} for 30 consecutive days. Consider archiving.`,
        },
      });
    }
  }
  return stale;
}

async function main() {
  // Load .env into process.env for this standalone script (Spotify creds etc.).
  try {
    (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
  } catch {
    // .env is optional
  }

  const day = startOfUtcDay();
  console.log(`\n=== Daily run for ${day.toISOString().slice(0, 10)} ===`);

  const spotify = await refreshSpotifyAll();
  if (spotify.updated || spotify.failed) {
    console.log(`Spotify refresh:     ${spotify.updated} updated, ${spotify.failed} failed`);
  }

  const results = await recalcAll(day);
  const alertsCount = results.reduce((n, r) => n + r.alertsCreated.length, 0);
  const highPriority = results.filter((r) => r.totalScore >= PRIORITY_CHART_MIN);
  const stale = await markStale(day);

  console.log(`Artists scored:      ${results.length}`);
  console.log(`Alerts generated:    ${alertsCount}`);
  console.log(`High priority (>=${PRIORITY_CHART_MIN}): ${highPriority.length}`);
  highPriority
    .sort((a, b) => b.totalScore - a.totalScore)
    .forEach((r) => console.log(`   ${r.totalScore.toString().padStart(3)}  ${r.name}`));
  if (stale.length) console.log(`Stale (flagged):     ${stale.join(", ")}`);
  console.log("=== Done ===\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// Daily operating job. Run once per day: npm run daily
// 1) Recalculate all artist scores for today
// 2) Alerts are generated inside recalc (daily performing tracks, spikes, rising)
// 3) Mark stale artists (below threshold for 30 consecutive days)
// 4) Print a summary
import { PrismaClient } from "@prisma/client";
import { startOfUtcDay, addDays } from "../lib/date";
import { recalcAll } from "../lib/engine";
import { PRIORITY_CHART_MIN } from "../lib/constants";

const prisma = new PrismaClient();

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
  const day = startOfUtcDay();
  console.log(`\n=== Daily run for ${day.toISOString().slice(0, 10)} ===`);

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

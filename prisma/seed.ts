// Seed sample artists with a week of metric history so charts and scoring
// have something to show immediately. Run: npm run seed
import { PrismaClient } from "@prisma/client";
import { startOfUtcDay, addDays } from "../lib/date";
import { recalcArtist } from "../lib/engine";

const prisma = new PrismaClient();

interface DayMetrics {
  spFollowers: number;
  spListeners: number;
  spCatalog: number;
  ttFollowers: number;
  ttLikes: number;
  ttAvgViews: number;
  ttUgc: number;
  igFollowers: number;
  igAvgViews: number;
  trackStreams: number;
}

// Generate 7 days of growth curves. `rate` controls how hot the artist is.
function series(base: DayMetrics, rate: number): DayMetrics[] {
  const out: DayMetrics[] = [];
  let cur = { ...base };
  for (let i = 0; i < 7; i++) {
    out.push({ ...cur });
    cur = {
      spFollowers: Math.round(cur.spFollowers * (1 + rate)),
      spListeners: Math.round(cur.spListeners * (1 + rate)),
      spCatalog: Math.round(cur.spCatalog * (1 + rate)),
      ttFollowers: Math.round(cur.ttFollowers * (1 + rate * 1.4)),
      ttLikes: Math.round(cur.ttLikes * (1 + rate * 1.6)),
      ttAvgViews: Math.round(cur.ttAvgViews * (1 + rate * 1.5)),
      ttUgc: Math.round(cur.ttUgc * (1 + rate)),
      igFollowers: Math.round(cur.igFollowers * (1 + rate)),
      igAvgViews: Math.round(cur.igAvgViews * (1 + rate * 1.3)),
      trackStreams: Math.round(cur.trackStreams * (1 + rate * 1.2)),
    };
  }
  return out;
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.alert.deleteMany();
  await prisma.dailyScore.deleteMany();
  await prisma.trackSnapshot.deleteMany();
  await prisma.track.deleteMany();
  await prisma.metricSnapshot.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.note.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.artistLink.deleteMany();
  await prisma.artist.deleteMany();

  const seeds = [
    {
      name: "Nova Vale",
      location: "Los Angeles, CA",
      genre: "Alt-pop",
      unsignedStatus: "CONFIRMED_UNSIGNED",
      rate: 0.2, // very hot
      base: {
        spFollowers: 42000, spListeners: 310000, spCatalog: 60000,
        ttFollowers: 88000, ttLikes: 210000, ttAvgViews: 62000, ttUgc: 55,
        igFollowers: 51000, igAvgViews: 40000, trackStreams: 42000,
      } as DayMetrics,
      signals: [
        ["PLAYLIST", "Added to Fresh Finds Pop"],
        ["VIRAL_MOMENT", "Sound trending on TikTok, 40+ creates/day"],
      ],
    },
    {
      name: "The Paper Kites Jr",
      location: "Austin, TX",
      genre: "Indie folk",
      unsignedStatus: "LIKELY_UNSIGNED",
      rate: 0.05, // steady
      base: {
        spFollowers: 12000, spListeners: 60000, spCatalog: 9000,
        ttFollowers: 15000, ttLikes: 22000, ttAvgViews: 9000, ttUgc: 8,
        igFollowers: 18000, igAvgViews: 7000, trackStreams: 3000,
      } as DayMetrics,
      signals: [["SOCIAL", "Consistent posting, small but loyal following"]],
    },
    {
      name: "KAIRO",
      location: "London, UK",
      genre: "Hyperpop",
      unsignedStatus: "LIKELY_UNSIGNED",
      rate: 0.09,
      base: {
        spFollowers: 25000, spListeners: 140000, spCatalog: 30000,
        ttFollowers: 60000, ttLikes: 95000, ttAvgViews: 45000, ttUgc: 30,
        igFollowers: 33000, igAvgViews: 22000, trackStreams: 11000,
      } as DayMetrics,
      signals: [["INDUSTRY_COSIGN", "Reposted by a well-known DJ"]],
    },
  ];

  const today = startOfUtcDay();

  for (const s of seeds) {
    const artist = await prisma.artist.create({
      data: {
        name: s.name,
        location: s.location,
        genre: s.genre,
        status: "MONITORING",
        unsignedStatus: s.unsignedStatus,
        source: "SEED",
        summary: `${s.name} is an independent ${s.genre} artist seeded for demo purposes.`,
        links: {
          create: [
            { platform: "SPOTIFY", url: `https://open.spotify.com/artist/${s.name.replace(/\s/g, "")}` },
            { platform: "TIKTOK", url: `https://tiktok.com/@${s.name.replace(/\s/g, "").toLowerCase()}` },
            { platform: "INSTAGRAM", url: `https://instagram.com/${s.name.replace(/\s/g, "").toLowerCase()}` },
          ],
        },
        notes: { create: [{ text: "Seeded lead replace with real research.", source: "SEED" }] },
        signals: {
          create: s.signals.map(([type, description]) => ({ type, description })),
        },
      },
    });

    const track = await prisma.track.create({
      data: { artistId: artist.id, name: `${s.name} Single`, spotifyUrl: "https://open.spotify.com/track/demo" },
    });

    const days = series(s.base, s.rate);
    for (let i = 0; i < days.length; i++) {
      const date = addDays(today, i - (days.length - 1)); // oldest first, ending today
      const m = days[i];
      await prisma.metricSnapshot.createMany({
        data: [
          { artistId: artist.id, platform: "SPOTIFY", snapshotDate: date, followers: m.spFollowers, monthlyListeners: m.spListeners, catalogStreams: m.spCatalog },
          { artistId: artist.id, platform: "TIKTOK", snapshotDate: date, followers: m.ttFollowers, totalLikes: m.ttLikes, avgRecentPostViews: m.ttAvgViews, avgRecentPostLikes: Math.round(m.ttLikes / 20), ugcCreates: m.ttUgc },
          { artistId: artist.id, platform: "INSTAGRAM", snapshotDate: date, followers: m.igFollowers, avgRecentPostViews: m.igAvgViews },
        ],
      });
      await prisma.trackSnapshot.create({
        data: { trackId: track.id, snapshotDate: date, streams: m.trackStreams, playlistName: "Fresh Finds" },
      });
    }

    await prisma.artist.update({ where: { id: artist.id }, data: { lastMetricAt: new Date() } });
  }

  // Score every artist for each of the 7 days so score history charts fill in.
  const artists = await prisma.artist.findMany();
  for (let i = 6; i >= 0; i--) {
    const day = addDays(today, -i);
    for (const a of artists) await recalcArtist(a.id, day);
  }

  console.log(`Seeded ${seeds.length} artists with 7 days of history and scores.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

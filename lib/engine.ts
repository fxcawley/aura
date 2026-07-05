// Shared engine used by both the daily job and on-demand UI recalculation.
// Pulls today's + yesterday's snapshots from the DB, computes scores, persists
// a DailyScore, updates the artist, and generates alerts.

import { prisma } from "./prisma";
import { startOfUtcDay, addDays } from "./date";
import { computeScore, PlatformMetrics, TrackDelta } from "./scoring";
import { recommendedActionForScore, PRIORITY_CHART_MIN } from "./constants";

function toMetrics(row: {
  followers: number | null;
  monthlyListeners: number | null;
  totalLikes: number | null;
  totalViews: number | null;
  avgRecentPostViews: number | null;
  avgRecentPostLikes: number | null;
  ugcCreates: number | null;
  catalogStreams: number | null;
} | undefined): PlatformMetrics | undefined {
  if (!row) return undefined;
  return {
    followers: row.followers,
    monthlyListeners: row.monthlyListeners,
    totalLikes: row.totalLikes,
    totalViews: row.totalViews,
    avgRecentPostViews: row.avgRecentPostViews,
    avgRecentPostLikes: row.avgRecentPostLikes,
    ugcCreates: row.ugcCreates,
    catalogStreams: row.catalogStreams,
  };
}

export interface RecalcResult {
  artistId: string;
  name: string;
  totalScore: number;
  prevScore: number | null;
  alertsCreated: string[];
}

export async function recalcArtist(artistId: string, day = startOfUtcDay()): Promise<RecalcResult> {
  const prevDay = addDays(day, -1);

  const artist = await prisma.artist.findUniqueOrThrow({ where: { id: artistId } });

  const [todaySnaps, prevSnaps, signals, tracks] = await Promise.all([
    prisma.metricSnapshot.findMany({ where: { artistId, snapshotDate: day } }),
    prisma.metricSnapshot.findMany({ where: { artistId, snapshotDate: prevDay } }),
    prisma.signal.count({ where: { artistId } }),
    prisma.track.findMany({
      where: { artistId },
      include: { snapshots: { where: { snapshotDate: { in: [day, prevDay] } } } },
    }),
  ]);

  const byPlatform = (rows: typeof todaySnaps, p: string) => rows.find((r) => r.platform === p);

  // Best-performing track delta today vs yesterday.
  let bestTrackDelta: TrackDelta | null = null;
  const trackAlerts: { trackId: string; streams: number; pct: number; abs: number }[] = [];
  for (const t of tracks) {
    const td = t.snapshots.find((s) => +s.snapshotDate === +day);
    const yd = t.snapshots.find((s) => +s.snapshotDate === +prevDay);
    if (!td?.streams) continue;
    const abs = td.streams - (yd?.streams ?? 0);
    const pct = yd?.streams ? (abs / yd.streams) * 100 : 0;
    const delta: TrackDelta = { streams24h: td.streams, pctGrowth: pct, absGrowth: abs };
    if (!bestTrackDelta || delta.streams24h > bestTrackDelta.streams24h) bestTrackDelta = delta;
    // Daily Performing Track: all three must be true
    if (td.streams >= 15000 && pct >= 10 && abs >= 10000) {
      trackAlerts.push({ trackId: t.id, streams: td.streams, pct, abs });
    }
  }

  const result = computeScore({
    today: {
      spotify: toMetrics(byPlatform(todaySnaps, "SPOTIFY")),
      tiktok: toMetrics(byPlatform(todaySnaps, "TIKTOK")),
      instagram: toMetrics(byPlatform(todaySnaps, "INSTAGRAM")),
    },
    prev: {
      spotify: toMetrics(byPlatform(prevSnaps, "SPOTIFY")),
      tiktok: toMetrics(byPlatform(prevSnaps, "TIKTOK")),
      instagram: toMetrics(byPlatform(prevSnaps, "INSTAGRAM")),
    },
    bestTrackDelta,
    signalCount: signals,
    artistConfidence: artist.artistConfidence,
  });

  // Previous total score (yesterday's DailyScore) for spike detection.
  const prevScoreRow = await prisma.dailyScore.findUnique({
    where: { artistId_scoreDate: { artistId, scoreDate: prevDay } },
  });
  const prevScore = prevScoreRow?.totalScore ?? null;

  await prisma.dailyScore.upsert({
    where: { artistId_scoreDate: { artistId, scoreDate: day } },
    create: { artistId, scoreDate: day, ...result },
    update: { ...result },
  });

  await prisma.artist.update({
    where: { id: artistId },
    data: {
      priorityScore: result.totalScore,
      recommendedAction: recommendedActionForScore(result.totalScore),
    },
  });

  const alertsCreated: string[] = [];

  for (const ta of trackAlerts) {
    await prisma.alert.create({
      data: {
        artistId,
        trackId: ta.trackId,
        type: "DAILY_PERFORMING_TRACK",
        title: `Daily Performing Track ${artist.name}`,
        message: `${ta.streams.toLocaleString()} streams/24h, +${ta.pct.toFixed(
          1
        )}%, +${ta.abs.toLocaleString()} abs.`,
      },
    });
    alertsCreated.push("DAILY_PERFORMING_TRACK");
  }

  if (prevScore != null && result.totalScore - prevScore >= 15) {
    await prisma.alert.create({
      data: {
        artistId,
        type: "SCORE_SPIKE",
        title: `Score Spike ${artist.name}`,
        message: `Score ${prevScore} -> ${result.totalScore} (+${result.totalScore - prevScore}).`,
      },
    });
    alertsCreated.push("SCORE_SPIKE");
  }

  // First-time rising: crossed the chart threshold for the first time.
  if (result.totalScore >= PRIORITY_CHART_MIN && (prevScore == null || prevScore < PRIORITY_CHART_MIN)) {
    await prisma.alert.create({
      data: {
        artistId,
        type: "FIRST_TIME_RISING",
        title: `First-Time Rising ${artist.name}`,
        message: `Crossed priority threshold (${PRIORITY_CHART_MIN}) with score ${result.totalScore}.`,
      },
    });
    alertsCreated.push("FIRST_TIME_RISING");
  }

  return { artistId, name: artist.name, totalScore: result.totalScore, prevScore, alertsCreated };
}

export async function recalcAll(day = startOfUtcDay()): Promise<RecalcResult[]> {
  const artists = await prisma.artist.findMany({ where: { status: { not: "ARCHIVED" } } });
  const out: RecalcResult[] = [];
  for (const a of artists) out.push(await recalcArtist(a.id, day));
  return out;
}

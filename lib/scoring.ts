// Transparent, rules-based scoring for V1. No ML.
// Each platform produces a 0-100 sub-score; the total is a weighted blend.
// All thresholds mirror the product spec so they're easy to tune in one place.

import { pctGrowth } from "./date";

export const WEIGHTS = {
  spotify: 0.45,
  tiktok: 0.35,
  instagram: 0.15,
  signal: 0.05,
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export interface PlatformMetrics {
  followers?: number | null;
  monthlyListeners?: number | null;
  totalLikes?: number | null;
  totalViews?: number | null;
  avgRecentPostViews?: number | null;
  avgRecentPostLikes?: number | null;
  ugcCreates?: number | null;
  catalogStreams?: number | null;
}

export interface TrackDelta {
  streams24h: number;
  pctGrowth: number;
  absGrowth: number;
}

export interface ScoreInput {
  today: {
    spotify?: PlatformMetrics;
    tiktok?: PlatformMetrics;
    instagram?: PlatformMetrics;
  };
  prev: {
    spotify?: PlatformMetrics;
    tiktok?: PlatformMetrics;
    instagram?: PlatformMetrics;
  };
  bestTrackDelta?: TrackDelta | null;
  signalCount?: number;
  artistConfidence?: number;
}

export interface ScoreResult {
  spotifyScore: number;
  tiktokScore: number;
  instagramScore: number;
  signalScore: number;
  totalScore: number;
  explanation: string;
}

export function scoreSpotify(
  today?: PlatformMetrics,
  prev?: PlatformMetrics,
  track?: TrackDelta | null
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  if (!today) return { score: 0, reasons };

  const catalog = today.catalogStreams ?? 0;
  const catalogPct = pctGrowth(today.catalogStreams, prev?.catalogStreams);
  const followerPct = pctGrowth(today.followers, prev?.followers);

  if (catalog >= 50000) {
    s += 30;
    reasons.push(`catalog 24h streams ${catalog.toLocaleString()} >= 50k (+30)`);
  }
  if (catalogPct >= 10) {
    s += 20;
    reasons.push(`catalog growth ${catalogPct.toFixed(1)}% >= 10% (+20)`);
  }
  if (track && track.streams24h >= 15000 && track.absGrowth >= 10000) {
    s += 30;
    reasons.push(
      `track 24h ${track.streams24h.toLocaleString()} & +${track.absGrowth.toLocaleString()} (+30)`
    );
  }
  if (followerPct >= 10) {
    s += 10;
    reasons.push(`spotify followers +${followerPct.toFixed(1)}% (+10)`);
  }
  return { score: clamp(s), reasons };
}

export function scoreTiktok(
  today?: PlatformMetrics,
  prev?: PlatformMetrics
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  if (!today) return { score: 0, reasons };

  const views = today.avgRecentPostViews ?? today.totalViews ?? 0;
  const likes = today.avgRecentPostLikes ?? today.totalLikes ?? 0;
  const followerPct = pctGrowth(today.followers, prev?.followers);
  const likesPct = pctGrowth(today.totalLikes, prev?.totalLikes);
  const ugc = today.ugcCreates ?? 0;

  if (views >= 50000) {
    s += 25;
    reasons.push(`views ${views.toLocaleString()} >= 50k (+25)`);
  }
  if (likes >= 5000) {
    s += 20;
    reasons.push(`likes ${likes.toLocaleString()} >= 5k (+20)`);
  }
  // "50% above recent 5-post average" — we approximate via day-over-day likes
  if (likesPct >= 50) {
    s += 20;
    reasons.push(`likes +${likesPct.toFixed(1)}% vs prior (+20)`);
  }
  if (ugc >= 40) {
    s += 20;
    reasons.push(`UGC creates ${ugc}/day >= 40 (+20)`);
  }
  if (followerPct >= 10) {
    s += 15;
    reasons.push(`tiktok followers +${followerPct.toFixed(1)}% (+15)`);
  }
  return { score: clamp(s), reasons };
}

export function scoreInstagram(
  today?: PlatformMetrics,
  prev?: PlatformMetrics
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  if (!today) return { score: 0, reasons };

  const followerPct = pctGrowth(today.followers, prev?.followers);
  const viewsPct = pctGrowth(today.avgRecentPostViews, prev?.avgRecentPostViews);

  if (viewsPct >= 50) {
    s += 25;
    reasons.push(`reel views +${viewsPct.toFixed(1)}% vs prior (+25)`);
  }
  if (followerPct >= 10) {
    s += 15;
    reasons.push(`ig followers +${followerPct.toFixed(1)}% (+15)`);
  }
  return { score: clamp(s), reasons };
}

export function computeScore(input: ScoreInput): ScoreResult {
  const sp = scoreSpotify(input.today.spotify, input.prev.spotify, input.bestTrackDelta);
  const tk = scoreTiktok(input.today.tiktok, input.prev.tiktok);
  const ig = scoreInstagram(input.today.instagram, input.prev.instagram);

  // Signal score: capped contribution from count of recorded signals.
  const signalScore = clamp((input.signalCount ?? 0) * 20);
  const signalReasons =
    (input.signalCount ?? 0) > 0 ? [`${input.signalCount} signal(s) (+${signalScore})`] : [];

  const total =
    sp.score * WEIGHTS.spotify +
    tk.score * WEIGHTS.tiktok +
    ig.score * WEIGHTS.instagram +
    signalScore * WEIGHTS.signal;

  const reasons = [
    ...sp.reasons.map((r) => `[Spotify] ${r}`),
    ...tk.reasons.map((r) => `[TikTok] ${r}`),
    ...ig.reasons.map((r) => `[Instagram] ${r}`),
    ...signalReasons.map((r) => `[Signals] ${r}`),
  ];

  return {
    spotifyScore: sp.score,
    tiktokScore: tk.score,
    instagramScore: ig.score,
    signalScore,
    totalScore: Math.round(clamp(total)),
    explanation: reasons.length ? reasons.join("\n") : "No scoring signals today.",
  };
}

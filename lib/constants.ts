// Enum-like constants. SQLite (via Prisma) has no native enums, so we validate
// against these arrays in app code instead. Keeping them here means one place
// to edit when the taxonomy grows.

export const ARTIST_STATUS = [
  "NEW_LEAD",
  "MONITORING",
  "HIGH_PRIORITY",
  "REACHED_OUT",
  "IN_CONVERSATION",
  "PASSED",
  "ARCHIVED",
] as const;
export type ArtistStatus = (typeof ARTIST_STATUS)[number];

export const UNSIGNED_STATUS = [
  "UNKNOWN",
  "LIKELY_UNSIGNED",
  "CONFIRMED_UNSIGNED",
  "LIKELY_SIGNED",
  "CONFIRMED_SIGNED",
] as const;
export type UnsignedStatus = (typeof UNSIGNED_STATUS)[number];

export const PLATFORM = [
  "SPOTIFY",
  "TIKTOK",
  "INSTAGRAM",
  "YOUTUBE",
  "APPLE_MUSIC",
  "SOUNDCLOUD",
  "ROSTR",
  "WEBSITE",
  "OTHER",
] as const;
export type Platform = (typeof PLATFORM)[number];

export const SIGNAL_TYPE = [
  "STREAMING",
  "SOCIAL",
  "PLAYLIST",
  "LIVE",
  "PRESS",
  "INDUSTRY_COSIGN",
  "EMAIL_SUBMISSION",
  "MANAGER_INTRO",
  "LABEL_INTEREST",
  "SYNC_LICENSING",
  "VIRAL_MOMENT",
] as const;
export type SignalType = (typeof SIGNAL_TYPE)[number];

export const ALERT_TYPE = [
  "DAILY_PERFORMING_TRACK",
  "SCORE_SPIKE",
  "FIRST_TIME_RISING",
  "MANUAL_REVIEW",
  "STALE_ARTIST",
] as const;
export type AlertType = (typeof ALERT_TYPE)[number];

// Priority Chart thresholds
export const PRIORITY_CHART_MIN = 60; // only show >= this on the main chart
export const THRESHOLDS = {
  HIGH: 80,
  MONITOR: 60,
  WATCHLIST: 40,
};

export function tierForScore(score: number): string {
  if (score >= THRESHOLDS.HIGH) return "High Priority";
  if (score >= THRESHOLDS.MONITOR) return "Monitor Closely";
  if (score >= THRESHOLDS.WATCHLIST) return "Watchlist";
  return "Stored Internally";
}

export function recommendedActionForScore(score: number): string {
  if (score >= 80) return "Reach out immediately";
  if (score >= 60) return "Monitor closely / research contact";
  if (score >= 40) return "Watch for another data point";
  return "Store internally";
}

// All daily snapshots are keyed to the start of the UTC day so that re-running
// the daily job on the same day upserts instead of duplicating.

export function startOfUtcDay(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

// Day-over-day helpers
export function pctGrowth(today?: number | null, prev?: number | null): number {
  if (today == null || prev == null || prev === 0) return 0;
  return ((today - prev) / prev) * 100;
}

export function absGrowth(today?: number | null, prev?: number | null): number {
  if (today == null || prev == null) return 0;
  return today - prev;
}

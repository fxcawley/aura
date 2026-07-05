import { tierForScore } from "@/lib/constants";

const STATUS_COLORS: Record<string, string> = {
  NEW_LEAD: "bg-sky-500/15 text-sky-300",
  MONITORING: "bg-amber-500/15 text-amber-300",
  HIGH_PRIORITY: "bg-rose-500/15 text-rose-300",
  REACHED_OUT: "bg-violet-500/15 text-violet-300",
  IN_CONVERSATION: "bg-emerald-500/15 text-emerald-300",
  PASSED: "bg-zinc-500/15 text-zinc-400",
  ARCHIVED: "bg-zinc-700/30 text-zinc-500",
};

const UNSIGNED_COLORS: Record<string, string> = {
  UNKNOWN: "bg-zinc-500/15 text-zinc-400",
  LIKELY_UNSIGNED: "bg-emerald-500/15 text-emerald-300",
  CONFIRMED_UNSIGNED: "bg-emerald-500/25 text-emerald-200",
  LIKELY_SIGNED: "bg-amber-500/15 text-amber-300",
  CONFIRMED_SIGNED: "bg-rose-500/15 text-rose-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] ?? "bg-zinc-500/15 text-zinc-400"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function UnsignedBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${UNSIGNED_COLORS[status] ?? "bg-zinc-500/15 text-zinc-400"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-rose-500/20 text-rose-200 border-rose-500/40"
      : score >= 60
        ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
        : score >= 40
          ? "bg-sky-500/20 text-sky-200 border-sky-500/40"
          : "bg-zinc-600/20 text-zinc-300 border-zinc-600/40";
  return (
    <span className={`inline-flex flex-col items-center rounded-lg border px-3 py-1 ${color}`}>
      <span className="text-lg font-bold leading-none">{score}</span>
      <span className="text-[10px] uppercase tracking-wide opacity-80">{tierForScore(score)}</span>
    </span>
  );
}

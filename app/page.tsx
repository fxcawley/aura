import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PRIORITY_CHART_MIN } from "@/lib/constants";
import { ScoreBadge, StatusBadge, UnsignedBadge } from "@/components/badges";
import { formatDate, startOfUtcDay, addDays } from "@/lib/date";
import { markAlertRead, recalcEveryone } from "@/app/actions";

export const dynamic = "force-dynamic";

async function growth(artistId: string, platform: string) {
  const day = startOfUtcDay();
  const [today, prev] = await Promise.all([
    prisma.metricSnapshot.findUnique({
      where: { artistId_platform_snapshotDate: { artistId, platform, snapshotDate: day } },
    }),
    prisma.metricSnapshot.findUnique({
      where: { artistId_platform_snapshotDate: { artistId, platform, snapshotDate: addDays(day, -1) } },
    }),
  ]);
  if (!today?.followers || !prev?.followers) return null;
  return ((today.followers - prev.followers) / prev.followers) * 100;
}

function Pct({ value }: { value: number | null }) {
  if (value == null) return <span className="text-zinc-600">—</span>;
  const color = value > 0 ? "text-emerald-400" : value < 0 ? "text-rose-400" : "text-zinc-400";
  return <span className={color}>{value > 0 ? "+" : ""}{value.toFixed(1)}%</span>;
}

export default async function DashboardPage() {
  const [chart, newest, statusGroups, alerts] = await Promise.all([
    prisma.artist.findMany({
      where: { priorityScore: { gte: PRIORITY_CHART_MIN }, status: { not: "ARCHIVED" } },
      orderBy: { priorityScore: "desc" },
    }),
    prisma.artist.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.artist.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.alert.findMany({ where: { isRead: false }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  const chartWithGrowth = await Promise.all(
    chart.map(async (a) => ({
      ...a,
      sp: await growth(a.id, "SPOTIFY"),
      tk: await growth(a.id, "TIKTOK"),
      ig: await growth(a.id, "INSTAGRAM"),
    }))
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Priority Chart</h1>
          <p className="text-sm text-zinc-400">
            Artists scoring ≥ {PRIORITY_CHART_MIN}. Everyone else stays in the database.
          </p>
        </div>
        <form action={recalcEveryone}>
          <button className="btn-primary">Recalculate all scores</button>
        </form>
      </div>

      {/* status counts */}
      <div className="flex flex-wrap gap-3">
        {statusGroups.map((g) => (
          <div key={g.status} className="card px-4 py-2">
            <div className="text-xs text-zinc-400">{g.status.replace(/_/g, " ")}</div>
            <div className="text-xl font-semibold">{g._count._all}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* chart table */}
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink/50 text-zinc-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Artist</th>
                <th className="px-3">Score</th>
                <th className="px-3">Status</th>
                <th className="px-3">SP</th>
                <th className="px-3">TT</th>
                <th className="px-3">IG</th>
                <th className="px-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {chartWithGrowth.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-zinc-500 py-10">
                    No artists above the threshold yet. Add leads and enter metrics.
                  </td>
                </tr>
              )}
              {chartWithGrowth.map((a) => (
                <tr key={a.id} className="border-t border-edge hover:bg-edge/40">
                  <td className="px-4 py-3">
                    <Link href={`/artists/${a.id}`} className="font-medium hover:text-indigo-300">
                      {a.name}
                    </Link>
                    <div className="text-xs text-zinc-500">{a.genre ?? "—"} · {a.location ?? "—"}</div>
                  </td>
                  <td className="px-3 text-center"><ScoreBadge score={a.priorityScore} /></td>
                  <td className="px-3 text-center"><StatusBadge status={a.status} /></td>
                  <td className="px-3 text-center"><Pct value={a.sp} /></td>
                  <td className="px-3 text-center"><Pct value={a.tk} /></td>
                  <td className="px-3 text-center"><Pct value={a.ig} /></td>
                  <td className="px-3 text-center text-zinc-500 text-xs">{formatDate(a.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* side column */}
        <div className="space-y-6">
          <div className="card p-4">
            <h2 className="font-medium mb-3">Alerts</h2>
            {alerts.length === 0 && <p className="text-sm text-zinc-500">No unread alerts.</p>}
            <ul className="space-y-2">
              {alerts.map((al) => (
                <li key={al.id} className="border border-edge rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="badge bg-indigo-500/15 text-indigo-300">
                      {al.type.replace(/_/g, " ")}
                    </span>
                    <form action={markAlertRead.bind(null, al.id)}>
                      <button className="text-xs text-zinc-500 hover:text-zinc-300">dismiss</button>
                    </form>
                  </div>
                  <div className="font-medium mt-1">{al.title}</div>
                  <div className="text-zinc-400 text-xs">{al.message}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-4">
            <h2 className="font-medium mb-3">Newest leads</h2>
            <ul className="space-y-1 text-sm">
              {newest.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <Link href={`/artists/${a.id}`} className="hover:text-indigo-300">{a.name}</Link>
                  <UnsignedBadge status={a.unsignedStatus} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

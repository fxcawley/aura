import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { startOfUtcDay, formatDate } from "@/lib/date";
import { recalcEveryone } from "@/app/actions";
import { StatusBadge } from "@/components/badges";

export const dynamic = "force-dynamic";

export default async function DailyReviewPage() {
  const day = startOfUtcDay();
  const artists = await prisma.artist.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: {
      metrics: { where: { snapshotDate: day } },
      scores: { where: { scoreDate: day } },
    },
    orderBy: { priorityScore: "desc" },
  });

  const needsUpdate = artists.filter((a) => a.metrics.length === 0);
  const updatedToday = artists.filter((a) => a.metrics.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily Review</h1>
          <p className="text-sm text-zinc-400">Your operating checklist for {formatDate(day)}.</p>
        </div>
        <form action={recalcEveryone}>
          <button className="btn-primary">Run scoring for everyone</button>
        </form>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-medium mb-3">
            Needs today&apos;s metrics <span className="text-zinc-500">({needsUpdate.length})</span>
          </h2>
          <ul className="space-y-2 text-sm">
            {needsUpdate.map((a) => (
              <li key={a.id} className="flex items-center justify-between border border-edge rounded-lg px-3 py-2">
                <Link href={`/artists/${a.id}`} className="hover:text-indigo-300">{a.name}</Link>
                <StatusBadge status={a.status} />
              </li>
            ))}
            {needsUpdate.length === 0 && <p className="text-zinc-500">Everyone is up to date. 🎉</p>}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="font-medium mb-3">
            Updated today <span className="text-zinc-500">({updatedToday.length})</span>
          </h2>
          <ul className="space-y-2 text-sm">
            {updatedToday.map((a) => (
              <li key={a.id} className="flex items-center justify-between border border-edge rounded-lg px-3 py-2">
                <Link href={`/artists/${a.id}`} className="hover:text-indigo-300">{a.name}</Link>
                <span className="text-zinc-400">
                  score {a.scores[0]?.totalScore ?? a.priorityScore}
                </span>
              </li>
            ))}
            {updatedToday.length === 0 && <p className="text-zinc-500">No metrics entered yet today.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}

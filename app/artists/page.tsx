import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ARTIST_STATUS } from "@/lib/constants";
import { ScoreBadge, StatusBadge, UnsignedBadge } from "@/components/badges";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; genre?: string; minScore?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = sp.status?.trim();
  const genre = sp.genre?.trim();
  const minScore = sp.minScore ? Number(sp.minScore) : undefined;

  const artists = await prisma.artist.findMany({
    where: {
      AND: [
        q ? { name: { contains: q } } : {},
        status ? { status } : {},
        genre ? { genre: { contains: genre } } : {},
        minScore != null && !Number.isNaN(minScore) ? { priorityScore: { gte: minScore } } : {},
      ],
    },
    orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Artist Database</h1>
        <Link href="/artists/new" className="btn-primary">Add Artist</Link>
      </div>

      <form className="card p-4 grid sm:grid-cols-4 gap-3" method="get">
        <input name="q" defaultValue={q} className="input" placeholder="Search name…" />
        <select name="status" defaultValue={status ?? ""} className="input">
          <option value="">All statuses</option>
          {ARTIST_STATUS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <input name="genre" defaultValue={genre} className="input" placeholder="Genre…" />
        <div className="flex gap-2">
          <input name="minScore" defaultValue={sp.minScore} className="input" placeholder="Min score" inputMode="numeric" />
          <button className="btn-primary">Filter</button>
        </div>
      </form>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink/50 text-zinc-400 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Artist</th>
              <th className="px-3">Location</th>
              <th className="px-3">Genre</th>
              <th className="px-3">Status</th>
              <th className="px-3">Unsigned</th>
              <th className="px-3">Score</th>
              <th className="px-3">Added</th>
              <th className="px-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {artists.length === 0 && (
              <tr><td colSpan={8} className="text-center text-zinc-500 py-10">No artists match.</td></tr>
            )}
            {artists.map((a) => (
              <tr key={a.id} className="border-t border-edge hover:bg-edge/40">
                <td className="px-4 py-3">
                  <Link href={`/artists/${a.id}`} className="font-medium hover:text-indigo-300">{a.name}</Link>
                </td>
                <td className="px-3 text-center text-zinc-400">{a.location ?? "—"}</td>
                <td className="px-3 text-center text-zinc-400">{a.genre ?? "—"}</td>
                <td className="px-3 text-center"><StatusBadge status={a.status} /></td>
                <td className="px-3 text-center"><UnsignedBadge status={a.unsignedStatus} /></td>
                <td className="px-3 text-center font-semibold">{a.priorityScore}</td>
                <td className="px-3 text-center text-zinc-500 text-xs">{formatDate(a.createdAt)}</td>
                <td className="px-3 text-center text-zinc-500 text-xs">{formatDate(a.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

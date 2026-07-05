import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/date";
import { ScoreBadge } from "@/components/badges";
import { ArtistControls } from "@/components/ArtistControls";
import { SpotifyRefreshButton } from "@/components/SpotifyRefreshButton";
import { MetricChart, ChartPoint } from "@/components/MetricChart";
import {
  MetricForm,
  NoteForm,
  LinkForm,
  SignalForm,
  ContactForm,
} from "@/components/ProfileForms";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-3">
      <h2 className="font-medium">{title}</h2>
      {children}
    </div>
  );
}

export default async function ArtistProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await prisma.artist.findUnique({
    where: { id },
    include: {
      links: true,
      contacts: true,
      notes: { orderBy: { createdAt: "desc" } },
      signals: { orderBy: { observedAt: "desc" } },
      tracks: { include: { snapshots: { orderBy: { snapshotDate: "asc" } } } },
      metrics: { orderBy: { snapshotDate: "asc" } },
      scores: { orderBy: { scoreDate: "asc" } },
    },
  });
  if (!artist) notFound();

  const latestScore = artist.scores.at(-1);

  // Build follower chart across platforms.
  const byDate = new Map<string, ChartPoint>();
  for (const m of artist.metrics) {
    const d = formatDate(m.snapshotDate);
    const point = byDate.get(d) ?? { date: d };
    if (m.followers != null) point[`${m.platform} followers`] = m.followers;
    byDate.set(d, point);
  }
  const followerData = Array.from(byDate.values());
  const followerSeries = ["SPOTIFY", "TIKTOK", "INSTAGRAM"]
    .map((p) => ({ key: `${p} followers`, label: `${p} followers` }))
    .filter((s) => followerData.some((d) => d[s.key] != null));

  const scoreData: ChartPoint[] = artist.scores.map((s) => ({
    date: formatDate(s.scoreDate),
    Total: s.totalScore,
    Spotify: s.spotifyScore,
    TikTok: s.tiktokScore,
    Instagram: s.instagramScore,
  }));

  return (
    <div className="space-y-6">
      <Link href="/artists" className="text-sm text-zinc-400 hover:text-zinc-200">← Database</Link>

      {/* header */}
      <div className="card p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {artist.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.profileImageUrl}
              alt={artist.name}
              className="h-16 w-16 rounded-full object-cover bg-edge"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-edge flex items-center justify-center text-2xl font-bold">
              {artist.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold">{artist.name}</h1>
            <p className="text-sm text-zinc-400">
              {artist.genre ?? "—"} · {artist.location ?? "—"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Source: {artist.source ?? "—"} · Added {formatDate(artist.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ScoreBadge score={artist.priorityScore} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ArtistControls
          artistId={artist.id}
          status={artist.status}
          unsignedStatus={artist.unsignedStatus}
        />
        <SpotifyRefreshButton artistId={artist.id} />
      </div>

      {/* recommended action */}
      <div className="card p-4 border-indigo-500/30">
        <span className="label">Recommended next action</span>
        <p className="text-lg font-medium text-indigo-200">
          {artist.recommendedAction ?? "Recalculate to generate."}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Score breakdown">
            {latestScore ? (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    ["Spotify", latestScore.spotifyScore],
                    ["TikTok", latestScore.tiktokScore],
                    ["Instagram", latestScore.instagramScore],
                    ["Signals", latestScore.signalScore],
                  ].map(([label, val]) => (
                    <div key={label as string} className="border border-edge rounded-lg py-2">
                      <div className="text-xs text-zinc-400">{label}</div>
                      <div className="text-lg font-semibold">{val as number}</div>
                    </div>
                  ))}
                </div>
                <pre className="text-xs text-zinc-400 whitespace-pre-wrap bg-ink rounded-lg p-3 border border-edge">
                  {latestScore.explanation}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No score yet enter metrics below and recalculate.</p>
            )}
          </Section>

          <Section title="Score history">
            <MetricChart
              data={scoreData}
              series={[
                { key: "Total", label: "Total" },
                { key: "Spotify", label: "Spotify" },
                { key: "TikTok", label: "TikTok" },
                { key: "Instagram", label: "Instagram" },
              ]}
            />
          </Section>

          <Section title="Follower growth">
            <MetricChart data={followerData} series={followerSeries} />
          </Section>

          <Section title="Enter today's metrics">
            <MetricForm artistId={artist.id} />
          </Section>

          <Section title="Signals">
            <SignalForm artistId={artist.id} />
            <ul className="space-y-2">
              {artist.signals.map((s) => (
                <li key={s.id} className="border border-edge rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-indigo-500/15 text-indigo-300">
                      {s.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-zinc-500">{formatDate(s.observedAt)}</span>
                  </div>
                  <div className="mt-1">{s.description}</div>
                  {s.sourceUrl && (
                    <a href={s.sourceUrl} target="_blank" className="text-xs text-indigo-400 hover:underline">
                      source
                    </a>
                  )}
                </li>
              ))}
              {artist.signals.length === 0 && <p className="text-sm text-zinc-500">No signals yet.</p>}
            </ul>
          </Section>
        </div>

        {/* right column */}
        <div className="space-y-6">
          <Section title="Links">
            <LinkForm artistId={artist.id} />
            <ul className="space-y-1 text-sm">
              {artist.links.map((l) => (
                <li key={l.id} className="flex items-center justify-between">
                  <span className="text-zinc-400">{l.platform}</span>
                  <a href={l.url} target="_blank" className="text-indigo-400 hover:underline truncate max-w-[180px]">
                    {l.url}
                  </a>
                </li>
              ))}
              {artist.links.length === 0 && <p className="text-sm text-zinc-500">No links.</p>}
            </ul>
          </Section>

          <Section title="Contacts">
            <ContactForm artistId={artist.id} />
            <ul className="space-y-2 text-sm">
              {artist.contacts.map((c) => (
                <li key={c.id} className="border border-edge rounded-lg p-3">
                  <div className="font-medium">{c.name ?? "—"} <span className="text-zinc-500 text-xs">{c.role}</span></div>
                  <div className="text-xs text-zinc-400">{c.company}</div>
                  <div className="text-xs text-zinc-400">{c.email} {c.phone}</div>
                </li>
              ))}
              {artist.contacts.length === 0 && <p className="text-sm text-zinc-500">No contacts.</p>}
            </ul>
          </Section>

          <Section title="Notes">
            <NoteForm artistId={artist.id} />
            <ul className="space-y-2 text-sm">
              {artist.notes.map((n) => (
                <li key={n.id} className="border border-edge rounded-lg p-3">
                  <div>{n.text}</div>
                  <div className="text-xs text-zinc-500 mt-1">{n.source} · {formatDate(n.createdAt)}</div>
                </li>
              ))}
              {artist.notes.length === 0 && <p className="text-sm text-zinc-500">No notes.</p>}
            </ul>
          </Section>

          <Section title="Research summary">
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">
              {artist.summary ?? "AI-generated artist history goes here in a later version."}
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

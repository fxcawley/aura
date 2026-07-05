// Fetch real Spotify data for an artist and persist it, then recalc score.
// Used by the profile "Refresh from Spotify" button and the daily job.
import { prisma } from "./prisma";
import { startOfUtcDay } from "./date";
import { recalcArtist } from "./engine";
import { pullSpotify } from "../scrapers/spotify";

export interface SpotifyRefreshResult {
  ok: boolean;
  reason?: string;
  followers?: number;
  tracks?: number;
}

export async function refreshArtistFromSpotify(artistId: string): Promise<SpotifyRefreshResult> {
  const link = await prisma.artistLink.findFirst({
    where: { artistId, platform: "SPOTIFY" },
  });
  if (!link) return { ok: false, reason: "No Spotify link on this artist." };

  const pull = await pullSpotify(link.url);
  const day = startOfUtcDay();

  // Only touch followers so manual monthlyListeners/catalogStreams are preserved.
  await prisma.metricSnapshot.upsert({
    where: { artistId_platform_snapshotDate: { artistId, platform: "SPOTIFY", snapshotDate: day } },
    create: { artistId, platform: "SPOTIFY", snapshotDate: day, followers: pull.artist.followers },
    update: { followers: pull.artist.followers },
  });

  // Fill genre / image only if not already set (don't clobber manual edits).
  const artist = await prisma.artist.findUniqueOrThrow({ where: { id: artistId } });
  await prisma.artist.update({
    where: { id: artistId },
    data: {
      genre: artist.genre ?? (pull.artist.genres[0] || null),
      profileImageUrl: artist.profileImageUrl ?? pull.artist.imageUrl ?? null,
      lastMetricAt: new Date(),
    },
  });

  // Upsert top tracks, de-duped by spotifyUrl.
  for (const t of pull.tracks) {
    const existing = await prisma.track.findFirst({ where: { artistId, spotifyUrl: t.url } });
    if (existing) {
      await prisma.track.update({ where: { id: existing.id }, data: { name: t.name, isrc: t.isrc } });
    } else {
      await prisma.track.create({
        data: {
          artistId,
          name: t.name,
          spotifyUrl: t.url,
          isrc: t.isrc,
          releaseDate: t.releaseDate ? new Date(t.releaseDate) : null,
        },
      });
    }
  }

  await recalcArtist(artistId).catch(() => {});
  return { ok: true, followers: pull.artist.followers, tracks: pull.tracks.length };
}

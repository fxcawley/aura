"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { startOfUtcDay } from "@/lib/date";
import { recalcArtist, recalcAll } from "@/lib/engine";

// ---------- Artists ----------

export async function createArtist(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };

  const name = get("name");
  if (!name) throw new Error("Artist name is required");

  const artist = await prisma.artist.create({
    data: {
      name,
      location: get("location"),
      genre: get("genre"),
      status: get("status") ?? "NEW_LEAD",
      unsignedStatus: get("unsignedStatus") ?? "UNKNOWN",
      summary: get("summary"),
      pcLine: get("pcLine"),
      source: get("source") ?? "MANUAL",
      priorityScore: Number(get("priorityScore") ?? 0),
    },
  });

  const linkPlatforms: [string, string][] = [
    ["SPOTIFY", "spotifyUrl"],
    ["TIKTOK", "tiktokUrl"],
    ["INSTAGRAM", "instagramUrl"],
    ["YOUTUBE", "youtubeUrl"],
  ];
  for (const [platform, field] of linkPlatforms) {
    const url = get(field);
    if (url) await prisma.artistLink.create({ data: { artistId: artist.id, platform, url } });
  }

  const note = get("notes");
  if (note) await prisma.note.create({ data: { artistId: artist.id, text: note, source: "ADD_FORM" } });

  const signal = get("signal");
  if (signal)
    await prisma.signal.create({
      data: { artistId: artist.id, type: "SOCIAL", description: signal },
    });

  await recalcArtist(artist.id).catch(() => {});
  revalidatePath("/");
  revalidatePath("/artists");
  return artist.id;
}

export async function updateArtistStatus(artistId: string, status: string) {
  await prisma.artist.update({ where: { id: artistId }, data: { status } });
  revalidatePath(`/artists/${artistId}`);
  revalidatePath("/artists");
  revalidatePath("/");
}

export async function updateUnsignedStatus(artistId: string, unsignedStatus: string) {
  await prisma.artist.update({ where: { id: artistId }, data: { unsignedStatus } });
  revalidatePath(`/artists/${artistId}`);
}

export async function deleteArtist(artistId: string) {
  await prisma.artist.delete({ where: { id: artistId } });
  revalidatePath("/artists");
  revalidatePath("/");
}

// ---------- Child records ----------

export async function addNote(artistId: string, text: string, source?: string) {
  if (!text.trim()) return;
  await prisma.note.create({ data: { artistId, text: text.trim(), source } });
  revalidatePath(`/artists/${artistId}`);
}

export async function addContact(artistId: string, data: FormData) {
  const g = (k: string) => (data.get(k) as string) || undefined;
  await prisma.contact.create({
    data: {
      artistId,
      name: g("name"),
      role: g("role"),
      company: g("company"),
      email: g("email"),
      phone: g("phone"),
      socialLink: g("socialLink"),
    },
  });
  revalidatePath(`/artists/${artistId}`);
}

export async function addLink(artistId: string, platform: string, url: string) {
  if (!url.trim()) return;
  await prisma.artistLink.create({ data: { artistId, platform, url: url.trim() } });
  revalidatePath(`/artists/${artistId}`);
}

export async function addSignal(artistId: string, type: string, description: string, sourceUrl?: string) {
  if (!description.trim()) return;
  await prisma.signal.create({
    data: { artistId, type, description: description.trim(), sourceUrl },
  });
  await recalcArtist(artistId).catch(() => {});
  revalidatePath(`/artists/${artistId}`);
}

// ---------- Metrics ----------

export async function saveMetricSnapshot(artistId: string, platform: string, data: FormData) {
  const num = (k: string) => {
    const v = data.get(k);
    if (typeof v !== "string" || v.trim() === "") return null;
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n) : null;
  };
  const day = startOfUtcDay();
  const payload = {
    followers: num("followers"),
    monthlyListeners: num("monthlyListeners"),
    totalLikes: num("totalLikes"),
    totalViews: num("totalViews"),
    avgRecentPostViews: num("avgRecentPostViews"),
    avgRecentPostLikes: num("avgRecentPostLikes"),
    ugcCreates: num("ugcCreates"),
    catalogStreams: num("catalogStreams"),
  };
  await prisma.metricSnapshot.upsert({
    where: { artistId_platform_snapshotDate: { artistId, platform, snapshotDate: day } },
    create: { artistId, platform, snapshotDate: day, ...payload },
    update: payload,
  });
  await prisma.artist.update({ where: { id: artistId }, data: { lastMetricAt: new Date() } });
  await recalcArtist(artistId).catch(() => {});
  revalidatePath(`/artists/${artistId}`);
  revalidatePath("/daily-review");
  revalidatePath("/");
}

// ---------- Scoring ----------

export async function recalcOne(artistId: string) {
  await recalcArtist(artistId);
  revalidatePath(`/artists/${artistId}`);
  revalidatePath("/");
}

export async function recalcEveryone() {
  await recalcAll();
  revalidatePath("/");
  revalidatePath("/artists");
  revalidatePath("/daily-review");
}

export async function markAlertRead(alertId: string) {
  await prisma.alert.update({ where: { id: alertId }, data: { isRead: true } });
  revalidatePath("/");
}

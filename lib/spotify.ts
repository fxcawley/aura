// Official Spotify Web API client (client-credentials flow).
// Provides REAL data: followers, popularity, genres, top tracks.
// NOTE: monthly listeners and stream counts are NOT available from the API —
// they stay as manual entry in the app.
//
// Requires env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
// Get them at https://developer.spotify.com/dashboard (free).

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

export interface SpotifyArtist {
  id: string;
  name: string;
  followers: number;
  popularity: number; // 0-100
  genres: string[];
  imageUrl?: string;
  url: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  popularity: number; // 0-100
  url: string;
  isrc?: string;
  releaseDate?: string;
}

export class SpotifyConfigError extends Error {}

let cachedToken: { token: string; expiresAt: number } | null = null;

function credentials(): { id: string; secret: string } {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    throw new SpotifyConfigError(
      "Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET. Add them to .env (see .env.example)."
    );
  }
  return { id, secret };
}

export function isSpotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) return cachedToken.token;
  const { id, secret } = credentials();
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

async function api<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    cachedToken = null; // force refresh next call
  }
  if (!res.ok) {
    throw new Error(`Spotify API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

// Accepts a raw ID, a spotify:artist:ID uri, or an open.spotify.com/artist/ID URL.
export function extractSpotifyArtistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return trimmed;
  const uri = trimmed.match(/spotify:artist:([a-zA-Z0-9]{22})/);
  if (uri) return uri[1];
  const url = trimmed.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?artist\/([a-zA-Z0-9]{22})/);
  if (url) return url[1];
  return null;
}

export async function getArtist(id: string): Promise<SpotifyArtist> {
  const a = await api<{
    id: string;
    name: string;
    followers: { total: number };
    popularity: number;
    genres: string[];
    images: { url: string }[];
    external_urls: { spotify: string };
  }>(`/artists/${id}`);
  return {
    id: a.id,
    name: a.name,
    followers: a.followers.total,
    popularity: a.popularity,
    genres: a.genres,
    imageUrl: a.images?.[0]?.url,
    url: a.external_urls.spotify,
  };
}

export async function getArtistTopTracks(id: string, market = "US"): Promise<SpotifyTrack[]> {
  const data = await api<{
    tracks: {
      id: string;
      name: string;
      popularity: number;
      external_urls: { spotify: string };
      external_ids?: { isrc?: string };
      album?: { release_date?: string };
    }[];
  }>(`/artists/${id}/top-tracks?market=${market}`);
  return data.tracks.map((t) => ({
    id: t.id,
    name: t.name,
    popularity: t.popularity,
    url: t.external_urls.spotify,
    isrc: t.external_ids?.isrc,
    releaseDate: t.album?.release_date,
  }));
}

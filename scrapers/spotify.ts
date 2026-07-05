// Real Spotify data source. Implements the same "fetch metrics" idea as the
// mock scraper, but also returns artist metadata + top tracks that the refresh
// routine persists. The future dedicated scraping tool can add TikTok/IG
// sources alongside this without changing the app/engine.

import {
  getArtist,
  getArtistTopTracks,
  extractSpotifyArtistId,
  isSpotifyConfigured,
  SpotifyArtist,
  SpotifyTrack,
} from "../lib/spotify";
import type { ScrapedArtistMetrics } from "./mock";

export interface SpotifyPull {
  artist: SpotifyArtist;
  tracks: SpotifyTrack[];
  // Mapped into the app's MetricSnapshot shape (SPOTIFY platform).
  metrics: ScrapedArtistMetrics;
}

export const spotifyConfigured = isSpotifyConfigured;
export { extractSpotifyArtistId };

export async function pullSpotify(spotifyUrlOrId: string): Promise<SpotifyPull> {
  const id = extractSpotifyArtistId(spotifyUrlOrId);
  if (!id) throw new Error(`Could not parse a Spotify artist ID from "${spotifyUrlOrId}".`);

  const [artist, tracks] = await Promise.all([getArtist(id), getArtistTopTracks(id)]);

  return {
    artist,
    tracks,
    metrics: {
      platform: "SPOTIFY",
      followers: artist.followers,
      // monthlyListeners / catalogStreams are NOT available from the API.
      // They remain null here and are entered manually in the app.
    },
  };
}

// Verify Spotify API creds + connectivity. Run:
//   npm run test:spotify -- <spotify artist url or id>
// Defaults to a well-known artist if none provided.
import { getArtist, getArtistTopTracks, extractSpotifyArtistId, isSpotifyConfigured } from "../lib/spotify";

async function main() {
  try {
    (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
  } catch {
    /* optional */
  }

  if (!isSpotifyConfigured()) {
    console.error("Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in .env");
    process.exit(1);
  }

  // Default: Clairo (indie artist) — replace with any artist URL/ID.
  const input = process.argv[2] || "https://open.spotify.com/artist/3l0CmX0FuQjFxr8Sk7Vqto";
  const id = extractSpotifyArtistId(input);
  if (!id) {
    console.error(`Could not parse an artist ID from "${input}"`);
    process.exit(1);
  }

  const artist = await getArtist(id);
  const tracks = await getArtistTopTracks(id);

  console.log("\n=== Spotify API OK ===");
  console.log(`Artist:      ${artist.name}`);
  console.log(`Followers:   ${artist.followers.toLocaleString()}`);
  console.log(`Popularity:  ${artist.popularity}/100`);
  console.log(`Genres:      ${artist.genres.join(", ") || "—"}`);
  console.log(`Top tracks:  ${tracks.length}`);
  tracks.slice(0, 5).forEach((t) => console.log(`   ${t.popularity.toString().padStart(3)}  ${t.name}`));
  console.log("======================\n");
}

main().catch((e) => {
  console.error("Spotify test failed:", e.message);
  process.exit(1);
});

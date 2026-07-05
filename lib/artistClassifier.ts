// Heuristic "is this an artist?" confidence for TikTok/IG leads.
// Manual-assist for V1: you paste bio text + known links, it returns a score.

export interface ArtistSignals {
  bio?: string;
  hasSpotify?: boolean;
  hasAppleOrSoundcloudOrYtTopic?: boolean;
  igCategoryArtistBand?: boolean;
  linkInBioToMusicPlatform?: boolean;
}

const ARTIST_WORDS = ["artist", "musician", "singer", "songwriter", "band", "producer"];
const RELEASE_WORDS = ["out now", "presave", "pre-save", "debut single", "ep", "album"];

export function artistConfidence(sig: ArtistSignals): {
  score: number;
  verdict: string;
  reasons: string[];
} {
  const reasons: string[] = [];
  let s = 0;
  const bio = (sig.bio ?? "").toLowerCase();

  if (sig.hasSpotify) {
    s += 30;
    reasons.push("Spotify profile URL exists (+30)");
  }
  if (sig.hasAppleOrSoundcloudOrYtTopic) {
    s += 25;
    reasons.push("Apple/SoundCloud/YouTube Topic URL (+25)");
  }
  if (ARTIST_WORDS.some((w) => bio.includes(w))) {
    s += 20;
    reasons.push("bio has artist/musician/singer/etc (+20)");
  }
  if (RELEASE_WORDS.some((w) => bio.includes(w))) {
    s += 15;
    reasons.push("bio has release language (OUT NOW/presave/etc) (+15)");
  }
  if (sig.igCategoryArtistBand) {
    s += 15;
    reasons.push("IG category Artist/Band (+15)");
  }
  if (sig.linkInBioToMusicPlatform) {
    s += 10;
    reasons.push("link-in-bio points to music platform (+10)");
  }

  const score = Math.min(100, s);
  const verdict =
    score >= 70 ? "likely artist" : score >= 40 ? "needs review" : "probably not artist";
  return { score, verdict, reasons };
}

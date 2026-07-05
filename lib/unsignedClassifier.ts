// Heuristic "is this artist unsigned?" manual-assist for V1.
// You paste the P/C line and/or YouTube "Provided to YouTube by" text.

const MAJOR_LABEL_HINTS = [
  "universal",
  "sony",
  "warner",
  "columbia",
  "capitol",
  "atlantic",
  "interscope",
  "republic",
  "def jam",
  "rca",
  "island",
  "polydor",
  "emi",
];

export interface UnsignedSignals {
  pcLine?: string;
  youtubeProvidedBy?: string;
  hasSpotify?: boolean;
  activeOnSocial?: boolean;
}

export function classifyUnsigned(sig: UnsignedSignals): {
  status: string;
  reasons: string[];
} {
  const reasons: string[] = [];
  const pc = (sig.pcLine ?? "").toLowerCase();
  const yt = (sig.youtubeProvidedBy ?? "").toLowerCase();
  const blob = `${pc} ${yt}`;

  if (pc.includes("under exclusive license to")) {
    reasons.push('P/C line: "under exclusive license to" -> signed');
    return { status: "LIKELY_SIGNED", reasons };
  }
  if (MAJOR_LABEL_HINTS.some((l) => blob.includes(l))) {
    reasons.push("known label name detected in P/C or YouTube credit -> signed");
    return { status: "LIKELY_SIGNED", reasons };
  }
  if (pc || yt) {
    reasons.push("P/C / YouTube credit present but no label match -> likely self-released");
    return { status: "LIKELY_UNSIGNED", reasons };
  }
  if (!sig.hasSpotify && sig.activeOnSocial) {
    reasons.push("no Spotify but active on TikTok/IG -> assume unsigned");
    return { status: "LIKELY_UNSIGNED", reasons };
  }
  reasons.push("insufficient evidence");
  return { status: "UNKNOWN", reasons };
}

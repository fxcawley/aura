// Placeholder scraper interface. V1 does NOT scrape — this defines the shape
// that real Spotify/TikTok/Instagram scrapers should return so the rest of the
// app (engine, metrics) never needs to change when we wire real sources in.

export interface ScrapedArtistMetrics {
  platform: "SPOTIFY" | "TIKTOK" | "INSTAGRAM";
  followers?: number;
  monthlyListeners?: number;
  totalLikes?: number;
  totalViews?: number;
  avgRecentPostViews?: number;
  avgRecentPostLikes?: number;
  ugcCreates?: number;
  catalogStreams?: number;
}

export interface ArtistScraper {
  platform: string;
  fetchMetrics(handleOrUrl: string): Promise<ScrapedArtistMetrics>;
}

// Returns deterministic fake numbers so you can test the pipeline without a network.
export const mockScraper: ArtistScraper = {
  platform: "MOCK",
  async fetchMetrics(handleOrUrl: string): Promise<ScrapedArtistMetrics> {
    const seed = [...handleOrUrl].reduce((n, c) => n + c.charCodeAt(0), 0);
    const rand = (min: number, max: number) => min + (seed % (max - min));
    return {
      platform: "SPOTIFY",
      followers: rand(1000, 90000),
      monthlyListeners: rand(5000, 400000),
      catalogStreams: rand(2000, 80000),
    };
  },
};

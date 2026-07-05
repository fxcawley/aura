// Minimal CSV lead importer. Run: npm run import:csv -- path/to/leads.csv
// Expected header (order-independent):
//   artist_name,spotify_url,tiktok_url,instagram_url,youtube_url,genre,location,status,notes,source
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { recalcArtist } from "../lib/engine";

const prisma = new PrismaClient();

// Tiny CSV parser: handles quoted fields and commas inside quotes.
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run import:csv -- path/to/leads.csv");
    process.exit(1);
  }
  const records = parseCsv(readFileSync(file, "utf8"));
  let created = 0;
  for (const r of records) {
    const name = r["artist_name"];
    if (!name) continue;
    const artist = await prisma.artist.create({
      data: {
        name,
        genre: r["genre"] || null,
        location: r["location"] || null,
        status: r["status"] || "NEW_LEAD",
        source: r["source"] || "CSV",
        summary: null,
      },
    });
    const links: [string, string][] = [
      ["SPOTIFY", r["spotify_url"]],
      ["TIKTOK", r["tiktok_url"]],
      ["INSTAGRAM", r["instagram_url"]],
      ["YOUTUBE", r["youtube_url"]],
    ];
    for (const [platform, url] of links) {
      if (url) await prisma.artistLink.create({ data: { artistId: artist.id, platform, url } });
    }
    if (r["notes"]) await prisma.note.create({ data: { artistId: artist.id, text: r["notes"], source: "CSV" } });
    await recalcArtist(artist.id).catch(() => {});
    created++;
  }
  console.log(`Imported ${created} artists from ${file}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

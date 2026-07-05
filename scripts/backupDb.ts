// Copy the SQLite DB into /backups with a date stamp. Run: npm run backup
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const src = join(process.cwd(), "prisma", "dev.db");
const dir = join(process.cwd(), "backups");

if (!existsSync(src)) {
  console.error("No prisma/dev.db found. Run `npm run setup` first.");
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const dest = join(dir, `dev-${stamp}.db`);
copyFileSync(src, dest);
console.log(`Backed up to ${dest}`);

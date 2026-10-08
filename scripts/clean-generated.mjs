import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

console.log("🧹 Cleaning generated cache and ephemeral logs...");

const ephemeralDirs = [
  path.join(root, "storage", "cache"),
  path.join(root, "storage", "logs"),
];

let totalCleaned = 0;

for (const dir of ephemeralDirs) {
  try {
    const files = await fs.readdir(dir);
    for (const f of files) {
      if (f === ".gitkeep") continue;
      const full = path.join(dir, f);
      const stat = await fs.stat(full);
      if (stat.isFile()) {
        await fs.unlink(full);
        totalCleaned++;
      }
    }
  } catch {
    // directory may not exist
  }
}

console.log(`✅ Cleaned ${totalCleaned} ephemeral files safely.`);

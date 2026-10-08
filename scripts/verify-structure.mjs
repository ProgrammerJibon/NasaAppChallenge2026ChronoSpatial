import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

console.log("🔍 Verifying Project Structure and Architecture Constraints...");

const requiredDirectories = [
  "next/app",
  "next/components",
  "next/lib",
  "next/hooks",
  "server/src/routes",
  "server/src/controllers",
  "server/src/services",
  "server/src/db",
  "python/spherex",
  "storage/demo",
  "storage/fits",
  "storage/previews",
  "storage/differences",
  "content",
  "docs",
];

const requiredFiles = [
  "next/package.json",
  "next/app/page.tsx",
  "next/app/explore/page.tsx",
  "next/app/timeline/page.tsx",
  "next/app/compare/page.tsx",
  "next/app/review/page.tsx",
  "next/app/about/page.tsx",
  "next/app/team/page.tsx",
  "next/app/admin/page.tsx",
  "server/package.json",
  "server/src/server.ts",
  "server/src/app.ts",
  "server/src/db/migrations/001_initial.sql",
  "python/requirements.txt",
  "python/worker.py",
  "storage/demo/manifest.json",
  "content/team.json",
  "content/mission.json",
];

const forbiddenPaths = [
  "next/app/api",
  "next/prisma",
  "server/prisma",
  "prisma",
];

let failed = false;

// 1. Check required directories
for (const relDir of requiredDirectories) {
  const full = path.join(root, relDir);
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) {
    console.error(`❌ Missing required directory: ${relDir}`);
    failed = true;
  }
}

// 2. Check required files
for (const relFile of requiredFiles) {
  const full = path.join(root, relFile);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
    console.error(`❌ Missing required file: ${relFile}`);
    failed = true;
  }
}

// 3. Check forbidden paths (ensuring clean architecture)
for (const relPath of forbiddenPaths) {
  const full = path.join(root, relPath);
  if (fs.existsSync(full)) {
    console.error(`❌ Forbidden legacy path found: ${relPath}`);
    failed = true;
  }
}

if (failed) {
  console.error("\n❌ Structure verification FAILED.");
  process.exit(1);
} else {
  console.log("✅ Project structure matches specification with zero legacy baggage.");
  process.exit(0);
}

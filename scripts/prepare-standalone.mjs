import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const standaloneDir = path.join(root, "next", ".next", "standalone");
const staticSrc = path.join(root, "next", ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
const publicSrc = path.join(root, "next", "public");
const publicDest = path.join(standaloneDir, "public");

if (!fs.existsSync(standaloneDir)) {
  console.error("❌ .next/standalone does not exist. Run 'npm --prefix next run build' first.");
  process.exit(1);
}

// 1. Copy .next/static -> .next/standalone/.next/static
if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, staticDest, { recursive: true });
  console.log("✅ Copied .next/static to .next/standalone/.next/static");
}

// 2. Copy public -> .next/standalone/public if it exists
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true });
  console.log("✅ Copied public/ to .next/standalone/public");
}

// 3. Create a cPanel Passenger-friendly app.js wrapper in standalone
const appJsPath = path.join(standaloneDir, "app.js");
const appJsContent = `// cPanel Phusion Passenger entrypoint for Next.js Standalone
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || 3000;
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

require('./server.js');
`;
fs.writeFileSync(appJsPath, appJsContent, "utf8");
console.log("✅ Created cPanel Passenger entrypoint: app.js in .next/standalone");

console.log("🎉 Next.js standalone package is fully ready for cPanel deployment!");

import { bootstrapDatabase } from "./bootstrap.js";
import { closePool } from "./connection.js";

async function main() {
  await bootstrapDatabase();
  await closePool();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

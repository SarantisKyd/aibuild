import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import app from "./app";
import { db, pool } from "@workspace/db";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

console.log(process.env.STRIPE_SECRET_KEY ? "Stripe loaded: YES" : "Stripe loaded: NO");

if (process.env.STRIPE_WEBHOOK_SECRET) {
  logger.info("Webhook secret loaded");
} else {
  logger.warn("WARNING: STRIPE_WEBHOOK_SECRET not set — webhooks will not work");
}

async function runMigrations(): Promise<void> {
  // Resolve the migrations folder relative to this file's own location (works both
  // in dev via tsx and in the bundled dist/index.mjs produced by esbuild), rather
  // than relying on process.cwd() which varies across hosting providers.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.resolve(here, "../../../lib/db/drizzle");

  logger.info({ migrationsFolder }, "Running database migrations");
  await migrate(db, { migrationsFolder });
  logger.info("Database migrations complete");
}

async function main() {
  try {
    await runMigrations();
  } catch (err) {
    logger.error({ err }, "Database migration failed");
    await pool.end().catch(() => {});
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

main();

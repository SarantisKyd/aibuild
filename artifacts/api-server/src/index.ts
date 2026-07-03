import app from "./app";
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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

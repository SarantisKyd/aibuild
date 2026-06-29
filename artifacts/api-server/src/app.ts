import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";
import { db } from "@workspace/db";
import { jobsTable, buildersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const app: Express = express();

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);

      const event = JSON.parse((req.body as Buffer).toString()) as {
        type: string;
        data: { object: Record<string, unknown> };
      };

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as {
          metadata?: { type?: string; jobId?: string; builderEmail?: string };
          customer?: string;
          subscription?: string;
        };

        if (session.metadata?.type === "featured_listing") {
          const jobId = Number(session.metadata.jobId);
          if (!isNaN(jobId)) {
            await db
              .update(jobsTable)
              .set({ featured: true })
              .where(eq(jobsTable.id, jobId));
            logger.info({ jobId }, "Job marked as featured");
          }
        }

        if (session.metadata?.type === "builder_subscription") {
          const builderEmail = session.metadata.builderEmail;
          if (builderEmail) {
            await db
              .update(buildersTable)
              .set({
                verified: true,
                stripeCustomerId: session.customer ?? null,
                stripeSubscriptionId: session.subscription ?? null,
              })
              .where(eq(buildersTable.email, builderEmail));
            logger.info({ builderEmail }, "Builder marked as verified");
          }
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as { customer?: string };
        if (subscription.customer) {
          await db
            .update(buildersTable)
            .set({ verified: false, stripeSubscriptionId: null })
            .where(eq(buildersTable.stripeCustomerId, subscription.customer));
          logger.info({ customerId: subscription.customer }, "Builder subscription cancelled — verified removed");
        }
      }

      res.status(200).json({ received: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error({ error: msg }, "Webhook processing error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;

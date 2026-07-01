import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";
import { db } from "@workspace/db";
import { jobsTable, buildersTable, toolsTable, purchasesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

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
          metadata?: { type?: string; jobId?: string; builderEmail?: string; toolId?: string };
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

        if (session.metadata?.type === "escrow_fund") {
          const jobId = Number(session.metadata.jobId);
          if (!isNaN(jobId)) {
            await db
              .update(jobsTable)
              .set({ status: "funded" })
              .where(eq(jobsTable.id, jobId));
            logger.info({ jobId }, "Job marked as funded");
          }
        }

        if (session.metadata?.type === "tool_purchase") {
          const toolId = Number(session.metadata.toolId);
          const sessionObj = event.data.object as {
            id?: string;
            customer_details?: { email?: string };
            metadata?: { toolId?: string };
          };
          const sessionId = sessionObj.id ?? "";
          const buyerEmail = sessionObj.customer_details?.email ?? null;
          if (!isNaN(toolId)) {
            await db
              .update(toolsTable)
              .set({ sales: sql`${toolsTable.sales} + 1` })
              .where(eq(toolsTable.id, toolId));
            // Record purchase with 48-hour dispute window
            // Payout to builder triggered manually or after dispute window — to be built next
            await db.insert(purchasesTable).values({
              toolId,
              buyerEmail,
              sessionId,
              disputeWindowEnds: Date.now() + 48 * 60 * 60 * 1000,
              status: "pending_payout",
            }).onConflictDoNothing();
            logger.info({ toolId, sessionId }, "Tool purchase recorded with dispute window");
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

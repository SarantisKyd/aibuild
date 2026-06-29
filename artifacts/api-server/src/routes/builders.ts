import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { buildersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();

router.get("/builders/:email", async (req, res) => {
  const { email } = req.params;
  const [builder] = await db
    .select()
    .from(buildersTable)
    .where(eq(buildersTable.email, email.toLowerCase()));
  if (!builder) {
    res.status(404).json({ error: "Builder not found" });
    return;
  }
  res.json(builder);
});

router.post("/builders/subscribe", async (req, res) => {
  const { email, name } = req.body as { email?: string; name?: string };
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const normalizedEmail = email.toLowerCase();

  const existing = await db
    .select()
    .from(buildersTable)
    .where(eq(buildersTable.email, normalizedEmail));

  if (existing.length === 0) {
    await db.insert(buildersTable).values({
      email: normalizedEmail,
      name: name ?? "",
      verified: false,
    });
  }

  const stripe = await getUncachableStripeClient();
  const appUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Verified Builder — AIBuild",
            description:
              "Priority placement in search · Verified checkmark on profile · Early job access (2hr before public)",
          },
          recurring: { interval: "month" },
          unit_amount: 900,
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${appUrl}/builder?subscribed=true`,
    cancel_url: `${appUrl}/builder`,
    customer_email: normalizedEmail,
    metadata: {
      type: "builder_subscription",
      builderEmail: normalizedEmail,
    },
  });

  res.json({ checkoutUrl: session.url });
});

export default router;

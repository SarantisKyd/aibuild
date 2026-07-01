import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { buildersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();

router.post("/builders", async (req, res) => {
  const { name, email, bio } = req.body as { name?: string; email?: string; bio?: string };
  if (!email || !name) {
    res.status(400).json({ error: "name and email are required" });
    return;
  }

  const normalizedEmail = email.toLowerCase();

  const existing = await db
    .select()
    .from(buildersTable)
    .where(eq(buildersTable.email, normalizedEmail));

  let stripeAccountId: string | null = existing[0]?.stripeAccountId ?? null;

  if (existing.length === 0) {
    const [inserted] = await db
      .insert(buildersTable)
      .values({ email: normalizedEmail, name: name.trim(), bio: bio?.trim() ?? null, verified: false })
      .returning();
    stripeAccountId = inserted.stripeAccountId ?? null;
  } else if (bio?.trim()) {
    await db
      .update(buildersTable)
      .set({ name: name.trim(), bio: bio.trim() })
      .where(eq(buildersTable.email, normalizedEmail));
  }

  try {
    const stripe = await getUncachableStripeClient();
    const appUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({ type: "express", email: normalizedEmail });
      stripeAccountId = account.id;
      await db
        .update(buildersTable)
        .set({ stripeAccountId })
        .where(eq(buildersTable.email, normalizedEmail));
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/builder`,
      return_url: `${appUrl}/builder?connected=true`,
      type: "account_onboarding",
    });

    res.json({ onboardingUrl: accountLink.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

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

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { toolsTable, buildersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateToolBody } from "@workspace/api-zod";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const BG_COLORS = [
  "#dbeafe", "#fce7f3", "#d1fae5", "#fef3c7",
  "#ede9fe", "#ffedd5", "#f0fdf4", "#fdf4ff",
];
function pickColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

router.get("/tools", async (_req, res) => {
  const tools = await db.select().from(toolsTable).orderBy(toolsTable.id);
  res.json(tools);
});

router.get("/tools/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid tool id" });
    return;
  }
  const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, id));
  if (!tool) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }
  res.json(tool);
});

router.post("/tools", async (req, res) => {
  const parsed = CreateToolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const { name, description, price, billingType, builderEmail, emoji } = parsed.data;

  const priceDisplay = billingType === "monthly"
    ? `$${(price / 100).toFixed(2)}/mo`
    : `$${(price / 100).toFixed(2)}`;

  const [tool] = await db
    .insert(toolsTable)
    .values({
      name,
      description,
      emoji,
      price: priceDisplay,
      priceAmount: price,
      billingType,
      builderEmail,
      bgColor: pickColor(name),
      category: "all",
      sales: 0,
      rating: "5.0",
      reviews: 0,
    })
    .returning();

  res.status(201).json(tool);
});

router.post("/tools/:id/buy", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid tool id" });
    return;
  }

  const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, id));
  if (!tool) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }

  if (!tool.priceAmount || !tool.billingType) {
    res.status(400).json({ error: "This tool does not support direct purchase" });
    return;
  }

  let stripeAccountId: string | null = null;
  if (tool.builderEmail) {
    const [builder] = await db
      .select()
      .from(buildersTable)
      .where(eq(buildersTable.email, tool.builderEmail));
    stripeAccountId = builder?.stripeAccountId ?? null;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const origin = req.headers.origin ?? `https://${req.headers.host}`;

    const feeAmount = Math.round(tool.priceAmount * 0.25);

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: tool.billingType === "monthly" ? "subscription" : "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: tool.name, description: tool.description },
            unit_amount: tool.priceAmount,
            ...(tool.billingType === "monthly"
              ? { recurring: { interval: "month" } }
              : {}),
          },
          quantity: 1,
        },
      ],
      metadata: { type: "tool_purchase", toolId: String(tool.id) },
      success_url: `${origin}/tool-access?id=${tool.id}`,
      cancel_url: `${origin}/tools`,
    };

    if (stripeAccountId) {
      if (tool.billingType === "monthly") {
        (sessionParams as Record<string, unknown>).subscription_data = {
          application_fee_percent: 25,
          transfer_data: { destination: stripeAccountId },
        };
      } else {
        (sessionParams as Record<string, unknown>).payment_intent_data = {
          application_fee_amount: feeAmount,
          transfer_data: { destination: stripeAccountId },
        };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ checkoutUrl: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: msg }, "Stripe checkout error for tool purchase");
    res.status(500).json({ error: "Could not create checkout session" });
  }
});

export default router;

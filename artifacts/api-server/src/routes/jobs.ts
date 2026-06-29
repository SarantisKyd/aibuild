import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { jobsTable, bidsTable, insertJobSchema, insertBidSchema } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { ListJobsResponse, CreateJobBody, SubmitBidBody } from "@workspace/api-zod";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();

router.get("/jobs", async (req, res) => {
  const { category } = req.query as { category?: string };
  let jobs;
  if (category && category !== "all") {
    jobs = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.category, category))
      .orderBy(desc(jobsTable.featured), jobsTable.createdAt);
  } else {
    jobs = await db
      .select()
      .from(jobsTable)
      .orderBy(desc(jobsTable.featured), jobsTable.createdAt);
  }
  res.json(ListJobsResponse.parse(jobs));
});

async function createFundCheckout(job: { id: number; title: string; budget: number }, origin: string): Promise<string | null> {
  try {
    const stripe = await getUncachableStripeClient();
    const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? origin;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Escrow: ${job.title}`,
              description: "Funds held in escrow until the job is completed",
            },
            unit_amount: job.budget * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/?funded=${job.id}`,
      cancel_url: `${appUrl}/?cancelled=${job.id}`,
      metadata: { jobId: String(job.id), type: "escrow_fund" },
    });
    return session.url;
  } catch (err) {
    console.error("Stripe error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

router.post("/jobs", async (req, res) => {
  console.log("[POST /api/jobs] request body:", JSON.stringify(req.body, null, 2));
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    console.log("[POST /api/jobs] validation error:", parsed.error.message);
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const validated = insertJobSchema.parse({ ...parsed.data, isNew: true });
    const [job] = await db.insert(jobsTable).values(validated).returning();
    console.log("[POST /api/jobs] job created:", JSON.stringify(job, null, 2));
    const origin = req.headers.origin ?? `https://${req.headers.host}`;
    const checkoutUrl = await createFundCheckout(job, origin);
    res.status(201).json({ job, checkoutUrl });
  } catch (err) {
    console.log("[POST /api/jobs] error:", err instanceof Error ? err.message : String(err));
    throw err;
  }
});

router.post("/jobs/:id/fund", async (req, res) => {
  const jobId = Number(req.params.id);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid job id" }); return; }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  const origin = req.headers.origin ?? `https://${req.headers.host}`;
  const checkoutUrl = await createFundCheckout(job, origin);
  if (!checkoutUrl) { res.status(500).json({ error: "Could not create checkout session" }); return; }
  res.json({ checkoutUrl });
});

router.get("/jobs/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(job);
});

router.post("/jobs/:id/bids", async (req, res) => {
  const jobId = Number(req.params.id);
  if (isNaN(jobId)) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const parsed = SubmitBidBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const validated = insertBidSchema.parse({ ...parsed.data, jobId });
  const [bid] = await db.insert(bidsTable).values(validated).returning();
  await db
    .update(jobsTable)
    .set({ bids: job.bids + 1 })
    .where(eq(jobsTable.id, jobId));
  res.status(201).json(bid);
});

router.post("/jobs/:id/feature", async (req, res) => {
  const jobId = Number(req.params.id);
  if (isNaN(jobId)) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if (job.featured) {
    res.status(400).json({ error: "Job is already featured" });
    return;
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
            name: "Featured Listing",
            description: `Feature "${job.title}" — get 3× more bids by appearing at the top`,
          },
          unit_amount: 1500,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${appUrl}/board?featured=${jobId}`,
    cancel_url: `${appUrl}/board`,
    metadata: {
      type: "featured_listing",
      jobId: String(jobId),
    },
  });

  res.json({ checkoutUrl: session.url });
});

export default router;

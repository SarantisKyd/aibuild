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

router.post("/jobs", async (req, res) => {
  console.log("[POST /api/jobs] request body:", JSON.stringify(req.body, null, 2));
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    console.log("[POST /api/jobs] validation error:", parsed.error.message);
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const validated = insertJobSchema.parse({
      ...parsed.data,
      isNew: true,
    });
    const [job] = await db.insert(jobsTable).values(validated).returning();
    console.log("[POST /api/jobs] job created:", JSON.stringify(job, null, 2));
    res.status(201).json(job);
  } catch (err) {
    console.log("[POST /api/jobs] error:", err instanceof Error ? err.message : String(err));
    throw err;
  }
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

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { jobsTable, bidsTable, buildersTable, insertJobSchema, insertBidSchema } from "@workspace/db";
import { eq, and, ne, desc } from "drizzle-orm";
import { ListJobsResponse, CreateJobBody, SubmitBidBody, DeliverJobBody, RequestRevisionBody, DisputeJobBody } from "@workspace/api-zod";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/jobs", async (req, res) => {
  const { category } = req.query as { category?: string };
  let jobs;
  if (category && category !== "all") {
    jobs = await db
      .select()
      .from(jobsTable)
      .where(and(eq(jobsTable.category, category), ne(jobsTable.status, "cancelled")))
      .orderBy(desc(jobsTable.featured), jobsTable.createdAt);
  } else {
    jobs = await db
      .select()
      .from(jobsTable)
      .where(ne(jobsTable.status, "cancelled"))
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
    await db.update(jobsTable).set({ stripeSessionId: session.id }).where(eq(jobsTable.id, job.id));
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

router.get("/jobs/:id/bids", async (req, res) => {
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
  const bids = await db.select().from(bidsTable).where(eq(bidsTable.jobId, jobId));
  res.json(bids);
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
  const validated = insertBidSchema.parse({
    ...parsed.data,
    builderEmail: parsed.data.builderEmail.toLowerCase(),
    jobId,
  });
  const [bid] = await db.insert(bidsTable).values(validated).returning();
  await db
    .update(jobsTable)
    .set({ bids: job.bids + 1 })
    .where(eq(jobsTable.id, jobId));
  res.status(201).json(bid);
});

router.post("/jobs/:id/bids/:bidId/accept", async (req, res) => {
  const jobId = Number(req.params.id);
  const bidId = Number(req.params.bidId);
  if (isNaN(jobId) || isNaN(bidId)) {
    res.status(400).json({ error: "Invalid job or bid id" });
    return;
  }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const [bid] = await db
    .select()
    .from(bidsTable)
    .where(and(eq(bidsTable.id, bidId), eq(bidsTable.jobId, jobId)));
  if (!bid) {
    res.status(404).json({ error: "Bid not found" });
    return;
  }

  await db.update(bidsTable).set({ status: "accepted" }).where(eq(bidsTable.id, bidId));
  await db
    .update(bidsTable)
    .set({ status: "rejected" })
    .where(and(eq(bidsTable.jobId, jobId), ne(bidsTable.id, bidId)));

  const [updatedJob] = await db
    .update(jobsTable)
    .set({
      status: "in_progress",
      acceptedBid: {
        id: bid.id,
        price: bid.price,
        deliveryTime: bid.deliveryTime,
        coverNote: bid.coverNote,
        builderEmail: bid.builderEmail,
      },
    })
    .where(eq(jobsTable.id, jobId))
    .returning();

  logger.info({ jobId, bidId }, "Bid accepted");
  res.json(updatedJob);
});

router.post("/jobs/:id/deliver", async (req, res) => {
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
  const parsed = DeliverJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { builderEmail, deliveryNote, deliveryLink } = parsed.data;
  if (!job.acceptedBid || job.acceptedBid.builderEmail.toLowerCase() !== builderEmail.toLowerCase()) {
    res.status(403).json({ error: "Only the accepted builder can submit work for this job" });
    return;
  }

  const [updatedJob] = await db
    .update(jobsTable)
    .set({ status: "delivered", deliveryNote, deliveryLink })
    .where(eq(jobsTable.id, jobId))
    .returning();

  logger.info({ jobId }, "Work delivered");
  res.json(updatedJob);
});

router.post("/jobs/:id/release", async (req, res) => {
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
  if (!job.acceptedBid) {
    res.status(400).json({ error: "This job has no accepted bid" });
    return;
  }

  const [builder] = await db
    .select()
    .from(buildersTable)
    .where(eq(buildersTable.email, job.acceptedBid.builderEmail.toLowerCase()));
  if (!builder || !builder.stripeAccountId) {
    res.status(400).json({ error: "Builder does not have a connected Stripe account" });
    return;
  }

  const builderPaid = Math.round(job.budget * 0.85);
  const platformFee = job.budget - builderPaid;

  try {
    const stripe = await getUncachableStripeClient();
    await stripe.transfers.create({
      amount: builderPaid * 100,
      currency: "usd",
      destination: builder.stripeAccountId,
      metadata: { jobId: String(jobId), type: "job_payout" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ jobId, err: msg }, "Stripe transfer failed");
    res.status(500).json({ error: msg });
    return;
  }

  await db.update(jobsTable).set({ status: "complete" }).where(eq(jobsTable.id, jobId));

  logger.info({ jobId, builderPaid, platformFee }, "Payment released");
  res.json({ success: true, builderPaid, platformFee });
});

router.post("/jobs/:id/revision", async (req, res) => {
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
  const parsed = RequestRevisionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updatedJob] = await db
    .update(jobsTable)
    .set({ status: "in_progress", revisionNote: parsed.data.revisionNote })
    .where(eq(jobsTable.id, jobId))
    .returning();

  logger.info({ jobId }, "Revision requested");
  res.json(updatedJob);
});

router.post("/jobs/:id/dispute", async (req, res) => {
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
  const parsed = DisputeJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updatedJob] = await db
    .update(jobsTable)
    .set({ status: "disputed", disputeReason: parsed.data.reason })
    .where(eq(jobsTable.id, jobId))
    .returning();

  logger.info({ jobId }, "Dispute opened");
  res.json(updatedJob);
});

router.post("/jobs/:id/cancel", async (req, res) => {
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
  if (job.acceptedBid) {
    res.status(400).json({ error: "Cannot cancel — builder already accepted. Open a dispute instead." });
    return;
  }
  if (job.status !== "open") {
    res.status(400).json({ error: "This job cannot be cancelled." });
    return;
  }

  if (job.stripeSessionId) {
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(job.stripeSessionId);
      if (session.payment_status === "paid" && session.payment_intent) {
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
        await stripe.refunds.create({ payment_intent: paymentIntentId });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ jobId, err: msg }, "Stripe refund failed");
      res.status(500).json({ error: msg });
      return;
    }
  }

  await db
    .update(jobsTable)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(jobsTable.id, jobId));

  logger.info({ jobId }, "Job cancelled and refunded");
  res.json({ success: true, refundAmount: job.budget });
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

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { jobsTable, bidsTable, insertJobSchema, insertBidSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ListJobsResponse, CreateJobBody, SubmitBidBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/jobs", async (req, res) => {
  const { category } = req.query as { category?: string };
  let jobs;
  if (category && category !== "all") {
    jobs = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.category, category))
      .orderBy(jobsTable.createdAt);
  } else {
    jobs = await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
  }
  res.json(ListJobsResponse.parse(jobs));
});

router.post("/jobs", async (req, res) => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const validated = insertJobSchema.parse({
    ...parsed.data,
    isNew: true,
  });
  const [job] = await db.insert(jobsTable).values(validated).returning();
  res.status(201).json(job);
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

export default router;

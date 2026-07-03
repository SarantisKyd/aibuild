import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { jobsTable, bidsTable, buildersTable } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";
import { DashboardClientQueryParams, DashboardClientResponse, DashboardBuilderQueryParams, DashboardBuilderResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/client", async (req, res) => {
  const parsed = DashboardClientQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.toLowerCase();

  const jobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.clientEmail, email))
    .orderBy(desc(jobsTable.createdAt));

  const builderEmails = [
    ...new Set(jobs.map((j) => j.acceptedBid?.builderEmail.toLowerCase()).filter((e): e is string => !!e)),
  ];
  const builders = builderEmails.length
    ? await db.select().from(buildersTable).where(inArray(buildersTable.email, builderEmails))
    : [];
  const nameByEmail = new Map(builders.map((b) => [b.email.toLowerCase(), b.name]));

  const result = jobs.map((job) => ({
    ...job,
    acceptedBuilderName: job.acceptedBid ? nameByEmail.get(job.acceptedBid.builderEmail.toLowerCase()) ?? null : null,
  }));

  res.json(DashboardClientResponse.parse(result));
});

router.get("/dashboard/builder", async (req, res) => {
  const parsed = DashboardBuilderQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.toLowerCase();

  const myBids = await db
    .select()
    .from(bidsTable)
    .where(eq(bidsTable.builderEmail, email))
    .orderBy(desc(bidsTable.createdAt));

  if (myBids.length === 0) {
    res.json(DashboardBuilderResponse.parse([]));
    return;
  }

  const jobIds = [...new Set(myBids.map((b) => b.jobId))];
  const jobs = await db.select().from(jobsTable).where(inArray(jobsTable.id, jobIds));
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  const result = myBids
    .map((bid) => {
      const job = jobById.get(bid.jobId);
      if (!job) return null;
      return { ...job, myBid: bid };
    })
    .filter((j): j is NonNullable<typeof j> => j !== null);

  res.json(DashboardBuilderResponse.parse(result));
});

export default router;

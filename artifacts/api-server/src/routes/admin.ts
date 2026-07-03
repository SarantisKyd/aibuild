import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { toolsTable, purchasesTable, jobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const ADMIN_PASSWORD = "aibuild2024";

const router: IRouter = Router();

function checkAdminPassword(req: import("express").Request, res: import("express").Response): boolean {
  const pw = req.headers["x-admin-password"];
  if (pw !== ADMIN_PASSWORD) {
    res.status(403).json({ error: "Access denied." });
    return false;
  }
  return true;
}

router.get("/admin/tools", async (req, res) => {
  if (!checkAdminPassword(req, res)) return;
  const tools = await db.select().from(toolsTable).orderBy(toolsTable.createdAt);
  res.json(tools);
});

router.post("/admin/tools/:id/approve", async (req, res) => {
  if (!checkAdminPassword(req, res)) return;
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [tool] = await db
    .update(toolsTable)
    .set({ status: "approved" })
    .where(eq(toolsTable.id, id))
    .returning();
  if (!tool) { res.status(404).json({ error: "Tool not found" }); return; }
  logger.info({ toolId: id }, "Tool approved");
  res.json(tool);
});

router.post("/admin/tools/:id/reject", async (req, res) => {
  if (!checkAdminPassword(req, res)) return;
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const reason = typeof req.body?.reason === "string" ? req.body.reason : "";
  const [tool] = await db
    .update(toolsTable)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(toolsTable.id, id))
    .returning();
  if (!tool) { res.status(404).json({ error: "Tool not found" }); return; }
  logger.info({ toolId: id, reason }, "Tool rejected");
  res.json(tool);
});

router.get("/admin/disputed-jobs", async (req, res) => {
  if (!checkAdminPassword(req, res)) return;
  const jobs = await db.select().from(jobsTable).where(eq(jobsTable.status, "disputed"));
  res.json(jobs);
});

router.get("/admin/cancelled-jobs", async (req, res) => {
  if (!checkAdminPassword(req, res)) return;
  const jobs = await db.select().from(jobsTable).where(eq(jobsTable.status, "cancelled"));
  res.json(jobs);
});

router.get("/admin/purchases", async (req, res) => {
  if (!checkAdminPassword(req, res)) return;
  const purchases = await db.select().from(purchasesTable).orderBy(purchasesTable.purchasedAt);
  res.json(purchases);
});

router.post("/admin/purchases/:id/release", async (req, res) => {
  if (!checkAdminPassword(req, res)) return;
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  // Payout to builder triggered manually after dispute window — transfer logic to be built next
  logger.info({ purchaseId: id }, "Payout released (placeholder)");
  res.json({ ok: true, message: "Payout released (placeholder)" });
});

export default router;

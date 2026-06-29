import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { toolsTable } from "@workspace/db";
import { ListToolsResponse } from "@workspace/api-zod";


const router: IRouter = Router();

router.get("/tools", async (_req, res) => {
  const tools = await db.select().from(toolsTable).orderBy(toolsTable.id);
  res.json(ListToolsResponse.parse(tools));
});

export default router;

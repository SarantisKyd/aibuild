import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import toolsRouter from "./tools";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jobsRouter);
router.use(toolsRouter);

export default router;

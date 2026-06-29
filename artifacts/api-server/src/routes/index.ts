import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import toolsRouter from "./tools";
import buildersRouter from "./builders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jobsRouter);
router.use(toolsRouter);
router.use(buildersRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import toolsRouter from "./tools";
import buildersRouter from "./builders";
import adminRouter from "./admin";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jobsRouter);
router.use(toolsRouter);
router.use(buildersRouter);
router.use(adminRouter);
router.use(dashboardRouter);

export default router;

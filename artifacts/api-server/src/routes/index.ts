import { Router, type IRouter } from "express";
import healthRouter from "./health";
import examArenaRouter from "./exam-arena";

const router: IRouter = Router();

router.use(healthRouter);
router.use(examArenaRouter);

export default router;

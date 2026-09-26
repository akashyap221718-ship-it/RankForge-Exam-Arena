import { Router, type IRouter } from "express";
import healthRouter from "./health";
import examArenaRouter from "./exam-arena";
import profileRouter from "./profile";
import platformRouter from "./platform";

const router: IRouter = Router();

router.use(healthRouter);
router.use(examArenaRouter);
router.use(profileRouter);
router.use(platformRouter);

export default router;

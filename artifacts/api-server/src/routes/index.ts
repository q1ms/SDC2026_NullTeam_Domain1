import { Router, type IRouter } from "express";
import healthRouter from "./health";
import careerRouter from "./career";
import trendsRouter from "./trends";

const router: IRouter = Router();

router.use(healthRouter);
router.use(careerRouter);
router.use(trendsRouter);

export default router;

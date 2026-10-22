import { GetLiveTrendsResponse } from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { getLiveTrends } from "../lib/live-trends";

const router: IRouter = Router();

router.get("/trends", async (req, res): Promise<void> => {
  try {
    const trends = await getLiveTrends();
    res.json(GetLiveTrendsResponse.parse(trends));
  } catch (error) {
    req.log.error({ err: error }, "Failed to fetch current AI news trends");
    res.status(502).json({
      error: "The public AI news feed is temporarily unavailable. Please try again shortly.",
    });
  }
});

export default router;

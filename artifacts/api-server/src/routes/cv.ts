import { Router, type IRouter } from "express";
import { parseCvWithRunpod } from "../lib/cv-parser";
import { runPathwayJob } from "../lib/runpod-pathway";

const router: IRouter = Router();

router.post("/parse-cv", async (req, res): Promise<void> => {
  const rawText = req.body && typeof req.body.rawText === "string" ? req.body.rawText : "";
  if (!rawText.trim()) {
    res.status(400).json({ error: "Resume text is required." });
    return;
  }
  if (rawText.length > 400_000) {
    res.status(413).json({ error: "Resume text is too long to analyze." });
    return;
  }

  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  const apiKey = process.env.RUNPOD_API_KEY;
  if (!endpointId || !apiKey) {
    res.status(503).json({ error: "The résumé analysis service is not configured." });
    return;
  }

  try {
    const fields = await parseCvWithRunpod(rawText, { endpointId, apiKey, runJob: runPathwayJob });
    res.json(fields);
  } catch {
    // Do not log résumé text or model output; both may contain personal information.
    req.log.error({ route: "/api/parse-cv" }, "AI résumé parsing failed.");
    res.status(502).json({ error: "We couldn’t analyze this résumé. Please try again or enter your details manually." });
  }
});

export default router;

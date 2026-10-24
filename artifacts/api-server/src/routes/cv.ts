import { Router, type IRouter } from "express";
import { parseCvWithRunpod } from "../lib/cv-parser";
import { runPathwayJob } from "../lib/runpod-pathway";
import { getCvParseJob, startCvParseJob } from "../lib/cv-jobs";

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
  if (!apiKey) {
    req.log.error({ route: "/api/parse-cv" }, "Missing API Key: process.env.RUNPOD_API_KEY is undefined.");
    res.status(503).json({ error: "The résumé analysis service is not configured because its API key is missing." });
    return;
  }
  if (!endpointId) {
    req.log.error({ route: "/api/parse-cv" }, "Missing RunPod endpoint: process.env.RUNPOD_ENDPOINT_ID is undefined.");
    res.status(503).json({ error: "The résumé analysis service is not configured." });
    return;
  }

  const jobId = startCvParseJob(
    () => parseCvWithRunpod(rawText, { endpointId, apiKey, runJob: runPathwayJob }),
    (error) => {
      // Keep résumé text, model output and credentials out of logs.
      const rawMessage = error instanceof Error ? error.message : String(error);
      const safeMessage = rawMessage
        .replaceAll(apiKey, "[REDACTED]")
        .replaceAll(endpointId, "[REDACTED]")
        .slice(0, 500);
      req.log.error({
        route: "/api/parse-cv",
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: safeMessage,
      }, "AI résumé parsing failed.");
    },
  );
  res.status(202).json({ jobId, status: "processing" });
});

router.get("/parse-cv/:jobId", async (req, res): Promise<void> => {
  const jobId = String(req.params.jobId ?? "");
  const job = getCvParseJob(jobId);
  if (!job) {
    res.status(404).json({ error: "Resume analysis job not found or expired." });
    return;
  }

  res.json(job);
});

export default router;

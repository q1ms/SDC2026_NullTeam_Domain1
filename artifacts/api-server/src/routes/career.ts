import { Router, type IRouter } from "express";
import {
  GetCareerProfileParams,
  GetCareerProfileResponse,
  GeneratePathwayBody,
  GeneratePathwayResponse,
  ListJobRolesResponse,
  ListSdgSkillMappingsResponse,
  SaveCareerProfileBody,
  SaveCareerProfileParams,
  SaveCareerProfileResponse,
} from "@workspace/api-zod";
import {
  getCareerProfile,
  listJobRoles,
  listSdgSkillMappings,
  saveCareerProfile,
} from "../lib/career-db";

const router: IRouter = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractRecommendations(output: unknown): unknown[] {
  let result = output;
  if (typeof result === "string") {
    result = JSON.parse(result);
  }

  if (isRecord(result)) {
    result = result.recommendations;
  }

  if (!Array.isArray(result)) {
    throw new Error("RunPod output did not include a recommendations array.");
  }
  return result;
}

router.get("/profiles/:profileId", (req, res): void => {
  const params = GetCareerProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const profile = getCareerProfile(params.data.profileId);
  res.json(profile ? GetCareerProfileResponse.parse(profile) : null);
});

router.put("/profiles/:profileId", (req, res): void => {
  const params = SaveCareerProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SaveCareerProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const profile = saveCareerProfile(params.data.profileId, body.data);
  res.json(SaveCareerProfileResponse.parse(profile));
});

router.post("/generate-pathway", async (req, res): Promise<void> => {
  const body = GeneratePathwayBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.message }, "Invalid career profile for pathway generation");
    res.status(400).json({ error: body.error.message });
    return;
  }

  const endpointId = process.env.RUNPOD_ENDPOINT_ID?.trim();
  const apiKey = process.env.RUNPOD_API_KEY?.trim();
  if (!endpointId || !apiKey) {
    req.log.error("RunPod credentials are not configured");
    res.status(503).json({ error: "Pathway generation is not configured." });
    return;
  }

  const roles = listJobRoles();
  try {
    const runpodResponse = await fetch(
      `https://api.runpod.ai/v2/${encodeURIComponent(endpointId)}/runsync`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          input: {
            profile: body.data,
            availableRoles: roles,
          },
        }),
        signal: AbortSignal.timeout(85_000),
      },
    );

    if (!runpodResponse.ok) {
      req.log.error({ upstreamStatus: runpodResponse.status }, "RunPod pathway request failed");
      res.status(502).json({ error: "The pathway service could not generate recommendations." });
      return;
    }

    const runpodResult: unknown = await runpodResponse.json();
    if (!isRecord(runpodResult) || runpodResult.status !== "COMPLETED") {
      req.log.warn(
        { upstreamStatus: isRecord(runpodResult) ? runpodResult.status : "invalid-response" },
        "RunPod pathway job did not complete",
      );
      res.status(502).json({ error: "The pathway service did not complete the request." });
      return;
    }

    const recommendations = extractRecommendations(runpodResult.output);
    const pathway = GeneratePathwayResponse.parse({
      recommendations,
      roleCount: roles.length,
    });
    res.json(pathway);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      req.log.warn("RunPod pathway request timed out");
      res.status(504).json({ error: "Pathway generation timed out. Please try again." });
      return;
    }

    req.log.error(
      { errorType: error instanceof Error ? error.name : "unknown" },
      "RunPod returned an invalid pathway response",
    );
    res.status(502).json({ error: "The pathway service returned an invalid response." });
  }
});

router.get("/roles", (_req, res): void => {
  res.json(ListJobRolesResponse.parse(listJobRoles()));
});

router.get("/sdgs/skills", (_req, res): void => {
  res.json(ListSdgSkillMappingsResponse.parse(listSdgSkillMappings()));
});

export default router;

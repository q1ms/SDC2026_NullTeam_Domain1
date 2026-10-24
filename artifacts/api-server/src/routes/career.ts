import { Router, type IRouter } from "express";
import {
  GetCareerProfileParams, GetCareerProfileResponse,
  GetGeneratedPathwayParams, GetGeneratedPathwayResponse,
  GeneratePathwayBody, GeneratePathwayResponse,
  ListJobRolesResponse, ListSdgSkillMappingsResponse,
  SaveCareerProfileBody, SaveCareerProfileParams, SaveCareerProfileResponse,
  GetCareerEvidenceResponse, GetPathwayDemoResponse,
} from "@workspace/api-zod";
import {
  getCareerProfile, getGeneratedPathway, listJobRoles, listSdgSkillMappings,
  saveGeneratedPathway, saveCareerProfile,
} from "../lib/career-db";
import { buildPathway, DEMO_PROFILE } from "../lib/career-matching";
import { curatedEvidence, getCareerEvidence } from "../lib/career-signals";
import { validateProfessionalProfile } from "../lib/professional-profile";

const router: IRouter = Router();

router.get("/career-evidence", async (_req, res): Promise<void> => {
  res.json(GetCareerEvidenceResponse.parse(await getCareerEvidence()));
});

router.get("/pathway-demo", (_req, res): void => {
  // Read-only, reproducible and independent of live services and stored profiles.
  res.json(GetPathwayDemoResponse.parse(buildPathway(
    "00000000-0000-4000-8000-000000000012", DEMO_PROFILE, listJobRoles(),
    curatedEvidence(), "2026-10-23T00:00:00.000Z",
  )));
});

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
  const body = SaveCareerProfileBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Check the profile fields, section limits, and maximum of 50 skills." });
    return;
  }
  const issues = validateProfessionalProfile(body.data);
  if (issues.length) {
    res.status(400).json({ error: issues.join(" ") });
    return;
  }
  res.json(SaveCareerProfileResponse.parse(saveCareerProfile(params.data.profileId, body.data)));
});

router.get("/profiles/:profileId/pathway", (req, res): void => {
  const params = GetGeneratedPathwayParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  res.json(GetGeneratedPathwayResponse.parse(getGeneratedPathway(params.data.profileId)));
});

router.post("/generate-pathway", async (req, res): Promise<void> => {
  const body = GeneratePathwayBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const profile = getCareerProfile(body.data.profileId);
  if (!profile) {
    res.status(404).json({ error: "Career profile not found." });
    return;
  }
  // The saved profile is authoritative; a stale caller must save edits first.
  const evidence = await getCareerEvidence();
  const candidate = GeneratePathwayResponse.parse(buildPathway(
    body.data.profileId, profile, listJobRoles(), evidence,
  ));
  // Do not save an out-of-date result if the profile changed while news loaded.
  if (JSON.stringify(getCareerProfile(profile.id)) !== JSON.stringify(profile)) {
    res.status(409).json({ error: "Your profile changed. Generate pathways again from the latest saved profile." });
    return;
  }
  const saved = saveGeneratedPathway(profile.id, candidate.scenarios, candidate.analysis);
  req.log.info({ model: candidate.analysis?.model }, "Saved evidence-grounded adoption comparisons");
  res.json(GeneratePathwayResponse.parse(saved));
});

router.get("/roles", (_req, res): void => {
  res.json(ListJobRolesResponse.parse(listJobRoles()));
});

router.get("/sdgs/skills", (_req, res): void => {
  res.json(ListSdgSkillMappingsResponse.parse(listSdgSkillMappings()));
});

export default router;

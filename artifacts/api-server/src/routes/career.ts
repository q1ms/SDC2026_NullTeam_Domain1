import { Router, type IRouter } from "express";
import {
  GetCareerProfileParams,
  GetCareerProfileResponse,
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

router.get("/roles", (_req, res): void => {
  res.json(ListJobRolesResponse.parse(listJobRoles()));
});

router.get("/sdgs/skills", (_req, res): void => {
  res.json(ListSdgSkillMappingsResponse.parse(listSdgSkillMappings()));
});

export default router;

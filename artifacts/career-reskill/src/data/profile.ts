import type { CareerProfile } from "./catalog";

const PROFILE_ID_KEY = "career-reskill-profile-id-v1";
const LEGACY_PROFILE_KEY = "career-compass-profile-v1";

export function getProfileId(): string {
  const existing = localStorage.getItem(PROFILE_ID_KEY);
  if (existing) return existing;

  const profileId = crypto.randomUUID();
  localStorage.setItem(PROFILE_ID_KEY, profileId);
  return profileId;
}

export function readLegacyProfile(): CareerProfile | null {
  try {
    const raw = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CareerProfile>;
    if (
      typeof parsed.currentRole !== "string" ||
      typeof parsed.industry !== "string" ||
      !Array.isArray(parsed.skills) ||
      !Array.isArray(parsed.interests)
    ) {
      return null;
    }

    return {
      currentRole: parsed.currentRole,
      yearsExperience: Number(parsed.yearsExperience) || 0,
      industry: parsed.industry,
      skills: parsed.skills.filter((item): item is string => typeof item === "string"),
      interests: parsed.interests.filter((item): item is string => typeof item === "string"),
      weeklyHours: Number(parsed.weeklyHours) || 3,
    };
  } catch {
    return null;
  }
}

export function clearLegacyProfile(): void {
  localStorage.removeItem(LEGACY_PROFILE_KEY);
}

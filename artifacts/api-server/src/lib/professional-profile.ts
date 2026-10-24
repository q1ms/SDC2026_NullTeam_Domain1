import type { CareerProfileInput, ProfessionalBackground, ProfessionalEntry } from "@workspace/api-zod";

export const PROFESSIONAL_SECTIONS = [
  "experience", "volunteering", "organizations", "education", "certifications",
  "courses", "projects", "awards", "publications", "languages", "testScores",
] as const satisfies readonly (keyof ProfessionalBackground)[];

function validDate(value: string): boolean {
  if (!/^\d{4}(-\d{2})?(-\d{2})?$/.test(value)) return false;
  const [year, month = 1, day = 1] = value.split("-").map(Number);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function safeUrl(value: string, linkedin = false): boolean {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
    return !linkedin || ((url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com"))
      && /^\/in\/[^/]+\/?$/.test(url.pathname));
  } catch { return false; }
}

export function validateProfessionalProfile(profile: CareerProfileInput): string[] {
  const issues: string[] = [];
  if (profile.skills.some((skill) => !skill.trim())) issues.push("Skills cannot contain blank entries.");
  if (profile.skills.length > 50) issues.push("Keep up to 50 skills; remove extra entries before saving.");
  const background = profile.professionalBackground;
  if (!background) return issues;
  if (background.linkedinUrl?.trim() && !safeUrl(background.linkedinUrl.trim(), true)) {
    issues.push("LinkedIn profile link must be an http(s) linkedin.com/in/ profile URL.");
  }
  for (const section of PROFESSIONAL_SECTIONS) {
    const entries = background[section] ?? [];
    const ids = new Set<string>();
    for (const [index, entry] of entries.entries()) {
      const label = `${section}, entry ${index + 1}`;
      if (ids.has(entry.id)) issues.push(`${label}: duplicate record identifier.`);
      ids.add(entry.id);
      if (!entry.title.trim()) issues.push(`${label}: add a title or name.`);
      for (const key of ["startDate", "endDate"] as const) {
        if (key === "endDate" && entry.current) continue;
        if (entry[key]?.trim() && !validDate(entry[key]!.trim())) {
          issues.push(`${label}: use a valid year, YYYY-MM or YYYY-MM-DD date.`);
        }
      }
      if (!entry.current && entry.startDate && entry.endDate
        && validDate(entry.startDate) && validDate(entry.endDate)
        && entry.startDate > entry.endDate && !entry.startDate.startsWith(entry.endDate)) {
        issues.push(`${label}: end date must not be before start date.`);
      }
      for (const key of ["url", "secondaryUrl"] as const) {
        if (entry[key]?.trim() && !safeUrl(entry[key]!.trim())) {
          issues.push(`${label}: resource links must be complete http(s) URLs.`);
        }
      }
    }
  }
  return issues;
}

/** Only explicit skill labels count. Narrative, institution prestige and grades never add points. */
export function professionalSkillContext(profile: CareerProfileInput) {
  const candidates: { skill: string; source: string }[] = profile.skills.map((skill) => ({ skill, source: "listed skill" }));
  const background = profile.professionalBackground;
  const add = (values: string[] | undefined, source: string) =>
    values?.forEach((skill) => candidates.push({ skill, source }));
  if (background) {
    for (const section of ["experience", "volunteering", "education", "certifications", "courses", "projects"] as const) {
      for (const entry of background[section] ?? []) {
        add(entry.skills, `${section}: explicit skill`);
        if (section === "education") add(entry.coursework, "education: coursework");
        if (section === "projects") add(entry.technologies, "projects: technology");
        if (section === "courses" || section === "certifications") {
          candidates.push({ skill: entry.title, source: `${section}: exact title` });
        }
      }
    }
  }
  return candidates;
}

export function professionalSummary(background?: ProfessionalBackground): string {
  if (!background) return "";
  const sections = PROFESSIONAL_SECTIONS.filter((section) => (background[section]?.length ?? 0) > 0)
    .map((section) => `${section}: ${background[section]!.length}`);
  const experience = background.experience?.map((entry: ProfessionalEntry) => entry.title).join(", ").slice(0, 250);
  return ` Professional background (self-reported): ${sections.join("; ") || "optional sections not supplied"}.`
    + (experience ? ` Experience: ${experience}.` : "")
    + (background.targetIndustry ? ` Target industry: ${background.targetIndustry.slice(0, 300)} (context only).` : "")
    + (background.location ? ` Location: ${background.location.slice(0, 300)} (local demand not verified).` : "");
}

import {
  listJobRoles,
  type CareerProfileInput,
  type JobRole,
} from "./career-db";

export type PathwayRecommendation = JobRole & {
  match: number;
};

export type GeneratedPathway = {
  recommendations: PathwayRecommendation[];
  roleCount: number;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, "");
}

export function generatePathway(profile: CareerProfileInput): GeneratedPathway {
  const roles = listJobRoles();
  const profileWords = [
    ...profile.skills,
    ...profile.interests,
    profile.industry,
    profile.currentRole,
  ].join(" ").toLowerCase();
  const normalizedSkills = normalize(profile.skills.join(" "));

  const recommendations = roles
    .map((role) => {
      let score = 48;
      const knownSkills = role.skills.filter((skill) => {
        const normalizedSkill = normalize(skill);
        return (
          normalizedSkills.includes(normalizedSkill) ||
          normalizedSkills
            .split(" ")
            .some((word) => word.length > 3 && normalizedSkill.includes(word))
        );
      });
      score += knownSkills.length * 8;

      const roleWords = `${role.title} ${role.skills.join(" ")}`.toLowerCase();
      profile.interests.forEach((interest) => {
        const key = interest.split(/[& ]/)[0].toLowerCase();
        if (key && roleWords.includes(key)) score += 9;
      });

      if (/data|analytics|finance|research/.test(profileWords) && /data|business intelligence/.test(roleWords)) {
        score += 7;
      }
      if (/health|finance|government|education/.test(profileWords) && /risk|security|operations/.test(roleWords)) {
        score += 4;
      }
      if (/operations|project|manager|consultant/.test(profileWords) && /operations|process|systems/.test(roleWords)) {
        score += 6;
      }
      if (/climate|sustainability|energy/.test(profileWords) && /sustainability|climate/.test(roleWords)) {
        score += 10;
      }

      return { ...role, match: Math.min(96, score) };
    })
    .sort((first, second) => second.match - first.match)
    .slice(0, 3);

  return {
    recommendations,
    roleCount: roles.length,
  };
}

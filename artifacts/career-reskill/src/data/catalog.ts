import type { JobRole } from "@workspace/api-client-react";

export type CareerProfile = {
  currentRole: string;
  yearsExperience: number;
  industry: string;
  skills: string[];
  interests: string[];
  weeklyHours: number;
};

export type RoleRecommendation = JobRole & {
  match: number;
};

export const INTEREST_OPTIONS = [
  'AI & automation', 'Data & analytics', 'People & learning', 'Climate & sustainability',
  'Cybersecurity', 'Product & customer experience', 'Operations & systems',
];

export function getRecommendations(profile: CareerProfile, roles: JobRole[]): RoleRecommendation[] {
  const words = [...profile.skills, ...profile.interests, profile.industry, profile.currentRole]
    .join(' ').toLowerCase();
  const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  return roles.map((role) => {
    let score = 48;
    const known = role.skills.filter((skill) => normalized(profile.skills.join(' ')).includes(normalized(skill)) || normalized(profile.skills.join(' ')).split(' ').some((w) => w.length > 3 && normalized(skill).includes(w)));
    score += known.length * 8;
    const roleWords = `${role.title} ${role.skills.join(' ')}`.toLowerCase();
    profile.interests.forEach((interest) => {
      const key = interest.split(/[& ]/)[0].toLowerCase();
      if (key && roleWords.includes(key)) score += 9;
    });
    if (/data|analytics|finance|research/.test(words) && /data|business intelligence/.test(roleWords)) score += 7;
    if (/health|finance|government|education/.test(words) && /risk|security|operations/.test(roleWords)) score += 4;
    if (/operations|project|manager|consultant/.test(words) && /operations|process|systems/.test(roleWords)) score += 6;
    if (/climate|sustainability|energy/.test(words) && /sustainability|climate/.test(roleWords)) score += 10;
    return { ...role, match: Math.min(96, score) };
  }).sort((a, b) => b.match - a.match).slice(0, 3);
}

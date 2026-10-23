export type CareerProfile = {
  currentRole: string;
  yearsExperience: number;
  industry: string;
  skills: string[];
  interests: string[];
  weeklyHours: number;
};

export const INTEREST_OPTIONS = [
  'AI & automation', 'Data & analytics', 'People & learning', 'Climate & sustainability',
  'Cybersecurity', 'Product & customer experience', 'Operations & systems',
  'Healthcare & MedTech', 'Creative & Design', 'FinTech & Blockchain',
  'Smart Cities & IoT', 'Supply Chain & Logistics', 'AI Ethics & Policy',
];

const INTEREST_SEARCH_TERMS: Record<string, string[]> = {
  'AI & automation': ['artificial intelligence', 'machine learning', 'tech', 'technology', 'robotics'],
  'Data & analytics': ['data science', 'business intelligence', 'tech', 'technology', 'statistics'],
  'People & learning': ['education', 'coaching', 'human resources', 'talent development'],
  'Climate & sustainability': ['environment', 'green technology', 'cleantech', 'renewable energy'],
  Cybersecurity: ['security', 'infosec', 'information security', 'tech', 'technology'],
  'Product & customer experience': ['product management', 'user experience', 'ux', 'customer success'],
  'Operations & systems': ['process improvement', 'business systems', 'tech', 'technology'],
  'Healthcare & MedTech': ['health', 'medical', 'medicine', 'digital health', 'biotech', 'tech'],
  'Creative & Design': ['creative', 'visual design', 'user experience', 'ux', 'ui'],
  'FinTech & Blockchain': ['finance', 'financial technology', 'payments', 'crypto', 'tech'],
  'Smart Cities & IoT': ['internet of things', 'urban technology', 'smart infrastructure', 'tech'],
  'Supply Chain & Logistics': ['transport', 'warehousing', 'procurement', 'distribution'],
  'AI Ethics & Policy': ['artificial intelligence', 'responsible ai', 'ai safety', 'governance', 'tech'],
};

function normalizeInterestSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function filterInterestOptions(query: string, selectedInterests: readonly string[] = []): string[] {
  const normalizedQuery = normalizeInterestSearch(query);
  if (!normalizedQuery) return [...INTEREST_OPTIONS];

  const selected = new Set(selectedInterests);
  return INTEREST_OPTIONS.filter((interest) => {
    if (selected.has(interest)) return true;

    return [interest, ...(INTEREST_SEARCH_TERMS[interest] ?? [])].some((term) => {
      const normalizedTerm = normalizeInterestSearch(term);
      return normalizedTerm.includes(normalizedQuery) || normalizedQuery.includes(normalizedTerm);
    });
  });
}

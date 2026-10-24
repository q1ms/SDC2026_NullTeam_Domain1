import type { CareerProfileInput } from '@workspace/api-client-react';

export type CareerProfile = CareerProfileInput;

export const INTEREST_OPTIONS = [
  'AI & automation', 'Data & analytics', 'People & learning', 'Climate & sustainability',
  'Cybersecurity', 'Product & customer experience', 'Operations & systems',
  'Healthcare & MedTech', 'Creative & Design', 'FinTech & Blockchain',
  'Smart Cities & IoT', 'Supply Chain & Logistics', 'AI Ethics & Policy',
  'Education & Teaching', 'EdTech', 'Instructional Design', 'Special Education',
  'Corporate Training', 'Higher Education Administration',
  'Food & Beverage', 'Hospitality Management', 'Culinary Arts', 'Hotel Operations',
  'Event Planning', 'Tourism Management',
  'Business Strategy', 'Project Management', 'Human Resources', 'Financial Analysis',
  'Operations Management', 'Public Relations',
  'Content Creation', 'Digital Marketing', 'Graphic Design', 'Journalism',
  'Video Production', 'UI/UX Design', 'Architecture',
  'Nursing', 'Healthcare Administration', 'Social Work', 'Public Health',
  'Psychology & Counseling', 'Biomedical Research',
  'Agricultural Technology', 'Renewable Energy', 'Environmental Policy', 'Urban Planning',
];

const INTEREST_SEARCH_TERMS: Record<string, string[]> = {
  'AI & automation': ['artificial intelligence', 'machine learning', 'tech', 'technology', 'robotics'],
  'Data & analytics': ['data science', 'business intelligence', 'tech', 'technology', 'statistics'],
  'People & learning': ['education', 'edu', 'coaching', 'human resources', 'talent development'],
  'Climate & sustainability': ['environment', 'green technology', 'cleantech', 'renewable energy'],
  Cybersecurity: ['security', 'infosec', 'information security', 'tech', 'technology'],
  'Product & customer experience': ['product management', 'user experience', 'ux', 'customer success'],
  'Operations & systems': ['business', 'bus', 'process improvement', 'business systems', 'tech', 'technology'],
  'Healthcare & MedTech': ['health', 'medical', 'medicine', 'digital health', 'biotech', 'tech'],
  'Creative & Design': ['creative', 'arts', 'art', 'visual design', 'user experience', 'ux', 'ui'],
  'FinTech & Blockchain': ['business', 'bus', 'finance', 'financial technology', 'payments', 'crypto', 'tech'],
  'Smart Cities & IoT': ['internet of things', 'urban technology', 'smart infrastructure', 'tech'],
  'Supply Chain & Logistics': ['business', 'bus', 'transport', 'warehousing', 'procurement', 'distribution'],
  'AI Ethics & Policy': ['artificial intelligence', 'responsible ai', 'ai safety', 'governance', 'tech'],
  'Education & Teaching': ['education', 'edu', 'teaching', 'teacher', 'school', 'learning'],
  EdTech: ['education', 'edu', 'teaching', 'learning technology', 'technology'],
  'Instructional Design': ['education', 'edu', 'curriculum', 'e-learning', 'learning design'],
  'Special Education': ['education', 'edu', 'teaching', 'inclusive learning', 'special needs'],
  'Corporate Training': ['education', 'edu', 'training', 'learning and development', 'business'],
  'Higher Education Administration': ['education', 'edu', 'higher education', 'university', 'college', 'administration'],
  'Food & Beverage': ['food', 'hospitality', 'culinary', 'dining', 'restaurant', 'beverage'],
  'Hospitality Management': ['food', 'hospitality', 'service', 'hotel', 'restaurant', 'tourism'],
  'Culinary Arts': ['food', 'hospitality', 'cooking', 'chef', 'restaurant', 'arts', 'art'],
  'Hotel Operations': ['food', 'hospitality', 'hotel', 'lodging', 'tourism', 'operations'],
  'Event Planning': ['food', 'hospitality', 'events', 'event management', 'tourism', 'planning'],
  'Tourism Management': ['food', 'hospitality', 'tourism', 'travel', 'destination', 'events'],
  'Business Strategy': ['business', 'bus', 'strategy', 'management', 'consulting'],
  'Project Management': ['business', 'bus', 'project', 'program management', 'operations'],
  'Human Resources': ['business', 'bus', 'hr', 'people', 'talent', 'workforce', 'recruiting'],
  'Financial Analysis': ['business', 'bus', 'finance', 'financial planning', 'accounting', 'investment', 'analytics'],
  'Operations Management': ['business', 'bus', 'operations', 'process improvement', 'manufacturing', 'logistics'],
  'Public Relations': ['business', 'bus', 'communications', 'pr', 'media', 'public affairs'],
  'Content Creation': ['arts', 'art', 'creative', 'media', 'writing', 'social media', 'production'],
  'Digital Marketing': ['arts', 'art', 'creative', 'marketing', 'advertising', 'social media', 'business'],
  'Graphic Design': ['arts', 'art', 'creative', 'design', 'visual', 'branding'],
  Journalism: ['arts', 'art', 'creative', 'media', 'writing', 'editorial', 'news', 'communications'],
  'Video Production': ['arts', 'art', 'creative', 'media', 'video', 'film', 'production'],
  'UI/UX Design': ['arts', 'art', 'creative', 'user experience', 'ux', 'ui', 'digital design'],
  Architecture: ['arts', 'art', 'creative', 'design', 'building', 'construction', 'urban planning'],
  Nursing: ['health', 'healthcare', 'medical', 'medicine', 'patient care', 'clinical'],
  'Healthcare Administration': ['health', 'healthcare', 'medical', 'medicine', 'hospital', 'business'],
  'Social Work': ['health', 'healthcare', 'social services', 'community support', 'counseling'],
  'Public Health': ['health', 'healthcare', 'medical', 'medicine', 'community health', 'epidemiology'],
  'Psychology & Counseling': ['health', 'healthcare', 'mental health', 'therapy', 'counseling', 'psychology'],
  'Biomedical Research': ['health', 'healthcare', 'medical', 'medicine', 'biomedical science', 'laboratory'],
  'Agricultural Technology': ['agriculture', 'agricultural', 'agtech', 'farming', 'food systems', 'technology'],
  'Renewable Energy': ['environment', 'climate', 'sustainability', 'energy', 'solar', 'wind', 'clean energy'],
  'Environmental Policy': ['environment', 'climate', 'sustainability', 'policy', 'conservation', 'government'],
  'Urban Planning': ['environment', 'climate', 'sustainability', 'city planning', 'architecture', 'infrastructure'],
};

function normalizeInterestSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getInterestSuggestions(query: string, selectedInterests: readonly string[] = []): string[] {
  const normalizedQuery = normalizeInterestSearch(query);
  if (!normalizedQuery) return [];

  const selected = new Set(selectedInterests);
  return INTEREST_OPTIONS.filter((interest) => {
    if (selected.has(interest)) return false;

    return [interest, ...(INTEREST_SEARCH_TERMS[interest] ?? [])].some((term) => {
      const normalizedTerm = normalizeInterestSearch(term);
      return normalizedTerm.includes(normalizedQuery) || normalizedQuery.includes(normalizedTerm);
    });
  });
}

export function addInterestSelection(current: readonly string[], interest: string): string[] {
  return current.includes(interest) ? [...current] : [...current, interest];
}

export function toggleInterestSelection(current: readonly string[], interest: string): string[] {
  return current.includes(interest)
    ? current.filter((item) => item !== interest)
    : [...current, interest];
}

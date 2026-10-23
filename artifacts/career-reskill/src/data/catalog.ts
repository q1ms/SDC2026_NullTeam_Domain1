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

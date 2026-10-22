export type SeedJobRole = {
  id: string;
  title: string;
  description: string;
  salary: string;
  timeToReady: string;
  skills: string[];
  steps: string[];
};

export type SeedSdg = {
  number: number;
  title: string;
  description: string;
  skills: string[];
};

export const JOB_ROLES: SeedJobRole[] = [
  {
    id: "ai-operations-specialist",
    title: "AI Operations Specialist",
    description: "Improve everyday work by designing, testing, and governing useful AI-enabled processes.",
    salary: "$92k–$128k",
    timeToReady: "4–6 months",
    skills: ["AI workflow design", "Process mapping", "Data storytelling", "Change management"],
    steps: [
      "Map a repeatable workflow from your current work and identify safe AI assists.",
      "Build a small automation prototype and document its quality checks.",
      "Practice communicating trade-offs, risks, and measurable outcomes to stakeholders.",
    ],
  },
  {
    id: "business-intelligence-analyst",
    title: "Business Intelligence Analyst",
    description: "Turn operational questions into clear metrics, dashboards, and useful decisions.",
    salary: "$78k–$112k",
    timeToReady: "5–8 months",
    skills: ["SQL fundamentals", "Data visualization", "Business storytelling", "Metric design"],
    steps: [
      "Learn SQL foundations by answering questions from a public dataset.",
      "Create a concise dashboard with a clear audience and a decision it supports.",
      "Build a portfolio case study that connects metrics to business action.",
    ],
  },
  {
    id: "customer-success-operations-lead",
    title: "Customer Success Operations Lead",
    description: "Make customer-facing teams more effective through better systems and processes.",
    salary: "$84k–$119k",
    timeToReady: "3–5 months",
    skills: ["Systems thinking", "CRM analytics", "Process design", "Facilitation"],
    steps: [
      "Document a customer journey and locate one high-friction handoff.",
      "Learn the reporting and automation capabilities of a modern CRM.",
      "Pilot a process improvement and share adoption and retention signals.",
    ],
  },
  {
    id: "cyber-risk-coordinator",
    title: "Cyber Risk Coordinator",
    description: "Help organizations identify technology risks and communicate practical controls.",
    salary: "$82k–$121k",
    timeToReady: "6–9 months",
    skills: ["Security fundamentals", "Risk communication", "Policy writing", "Vendor assessment"],
    steps: [
      "Study core security and privacy concepts relevant to your industry.",
      "Practice translating a technical risk into clear business language.",
      "Draft a vendor assessment or incident-response tabletop for your portfolio.",
    ],
  },
  {
    id: "sustainability-data-associate",
    title: "Sustainability Data Associate",
    description: "Support credible sustainability reporting with careful data collection and analysis.",
    salary: "$74k–$106k",
    timeToReady: "5–7 months",
    skills: ["Climate data basics", "Data quality", "Reporting frameworks", "Stakeholder research"],
    steps: [
      "Learn how organizations collect and validate sustainability indicators.",
      "Explore reporting frameworks and compare two public company disclosures.",
      "Create a sample analysis that makes data limitations explicit.",
    ],
  },
];

export const SDGS: SeedSdg[] = [
  {
    number: 1,
    title: "No Poverty",
    description: "End poverty in all its forms everywhere.",
    skills: ["Financial inclusion", "Social protection program design", "Inclusive service delivery"],
  },
  {
    number: 2,
    title: "Zero Hunger",
    description: "End hunger, achieve food security and improved nutrition, and promote sustainable agriculture.",
    skills: ["Food systems analysis", "Sustainable agriculture", "Nutrition program planning"],
  },
  {
    number: 3,
    title: "Good Health and Well-Being",
    description: "Ensure healthy lives and promote well-being for all at all ages.",
    skills: ["Public health data analysis", "Health promotion", "Epidemiology fundamentals"],
  },
  {
    number: 4,
    title: "Quality Education",
    description: "Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all.",
    skills: ["Instructional design", "Learning analytics", "Digital pedagogy"],
  },
  {
    number: 5,
    title: "Gender Equality",
    description: "Achieve gender equality and empower all women and girls.",
    skills: ["Gender impact assessment", "Inclusive policy design", "Gender-disaggregated data analysis"],
  },
  {
    number: 6,
    title: "Clean Water and Sanitation",
    description: "Ensure availability and sustainable management of water and sanitation for all.",
    skills: ["Water quality monitoring", "Water resource management", "Sanitation planning"],
  },
  {
    number: 7,
    title: "Affordable and Clean Energy",
    description: "Ensure access to affordable, reliable, sustainable and modern energy for all.",
    skills: ["Renewable energy systems", "Energy auditing", "Grid flexibility analysis"],
  },
  {
    number: 8,
    title: "Decent Work and Economic Growth",
    description: "Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all.",
    skills: ["Labor market analysis", "Workforce development", "Responsible business practices"],
  },
  {
    number: 9,
    title: "Industry, Innovation and Infrastructure",
    description: "Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation.",
    skills: ["Systems engineering", "Digital transformation", "Infrastructure resilience"],
  },
  {
    number: 10,
    title: "Reduced Inequalities",
    description: "Reduce inequality within and among countries.",
    skills: ["Equity impact analysis", "Accessible service design", "Inclusive data practices"],
  },
  {
    number: 11,
    title: "Sustainable Cities and Communities",
    description: "Make cities and human settlements inclusive, safe, resilient and sustainable.",
    skills: ["Urban planning", "Geographic information systems", "Climate-resilient infrastructure"],
  },
  {
    number: 12,
    title: "Responsible Consumption and Production",
    description: "Ensure sustainable consumption and production patterns.",
    skills: ["Life-cycle assessment", "Circular economy design", "Sustainable procurement"],
  },
  {
    number: 13,
    title: "Climate Action",
    description: "Take urgent action to combat climate change and its impacts.",
    skills: ["Climate risk analysis", "Greenhouse gas accounting", "Climate adaptation planning"],
  },
  {
    number: 14,
    title: "Life Below Water",
    description: "Conserve and sustainably use the oceans, seas and marine resources for sustainable development.",
    skills: ["Marine ecosystem monitoring", "Ocean data analysis", "Sustainable fisheries management"],
  },
  {
    number: 15,
    title: "Life on Land",
    description: "Protect, restore and promote sustainable use of terrestrial ecosystems and halt biodiversity loss.",
    skills: ["Biodiversity monitoring", "Ecological restoration", "Land-use analysis"],
  },
  {
    number: 16,
    title: "Peace, Justice and Strong Institutions",
    description: "Promote peaceful and inclusive societies, provide access to justice for all and build effective, accountable institutions.",
    skills: ["Human rights due diligence", "Governance analysis", "Conflict-sensitive program design"],
  },
  {
    number: 17,
    title: "Partnerships for the Goals",
    description: "Strengthen the means of implementation and revitalize the global partnership for sustainable development.",
    skills: ["Cross-sector partnership development", "Impact measurement", "Stakeholder facilitation"],
  },
];

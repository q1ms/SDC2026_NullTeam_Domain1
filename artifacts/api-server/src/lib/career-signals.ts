import type { CareerSignal, EvidenceSnapshot, LiveTrendsResponse } from "@workspace/api-zod";
import { getLiveTrends } from "./live-trends";

// Manually reviewed snapshots, not automatically refreshed labor-market statistics.
// Update source dates, review date, scope and mappings together after checking the source.
export const REVIEWED_AT = "2026-10-23";
export const PUBLIC_SIGNALS: CareerSignal[] = [
  {
    id: "wef-green-transition-2025",
    title: "Employers expect the green transition to change work and skill needs",
    source: "World Economic Forum · Future of Jobs Report 2025",
    url: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/",
    publishedAt: "2025-01-07", fetchedAt: REVIEWED_AT,
    scope: "Global employer survey · 55 economies · expectations for 2025–2030",
    kind: "employer-survey",
    limitation: "Employer expectations about climate adaptation and mitigation are not local vacancies. Relevance to sustainability data and reporting is our inference, not a measured forecast for this catalog title.",
    roleIds: ["sustainability-data-associate"],
    skills: ["Climate data basics", "Reporting frameworks"], weight: 2,
  },
  {
    id: "wef-human-skills-2025",
    title: "Employers emphasize analytical thinking, resilience and leadership alongside technology",
    source: "World Economic Forum · Future of Jobs Report 2025",
    url: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/",
    publishedAt: "2025-01-07", fetchedAt: REVIEWED_AT,
    scope: "Global employer survey · 55 economies · expectations for 2025–2030",
    kind: "employer-survey",
    limitation: "Broad self-reported skill priorities, not evidence of hiring for this catalog role. We infer relevance to human-led customer operations; industry and local needs may differ.",
    roleIds: ["customer-success-operations-lead"],
    skills: ["Systems thinking", "Facilitation"], weight: 2,
  },
  {
    id: "wef-skills-2025",
    title: "Employers expect AI, big data and cybersecurity skills to grow",
    source: "World Economic Forum · Future of Jobs Report 2025",
    url: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/",
    publishedAt: "2025-01-07", fetchedAt: REVIEWED_AT,
    scope: "Global employer survey · 1,000+ employers, 55 economies · expectations for 2025–2030",
    kind: "employer-survey",
    limitation: "Employer expectations, not observed vacancies. Large employers are not representative of every local market. Catalog-role mappings and point weights are our editorial inference.",
    roleIds: ["ai-operations-specialist", "business-intelligence-analyst", "cyber-risk-coordinator"],
    skills: ["AI workflow design", "Data visualization", "Security fundamentals"], weight: 4,
  },
  {
    id: "bls-security-outlook",
    title: "Information security analysts: faster-than-average projected employment growth",
    source: "US Bureau of Labor Statistics · Occupational Outlook Handbook",
    url: "https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm",
    publishedAt: "2026-08-27", fetchedAt: REVIEWED_AT,
    scope: "United States · national occupational projections, 2025–2035",
    kind: "labor-market",
    limitation: "A projection, not a guarantee or local vacancy count. Information security analyst is an adjacent occupation, not the catalog's Cyber Risk Coordinator; qualifications may differ.",
    roleIds: ["cyber-risk-coordinator"], skills: ["Security fundamentals", "Vendor assessment"], weight: 4,
  },
  {
    id: "nist-ai-rmf",
    title: "AI risk management emphasizes evaluation, governance and human oversight",
    source: "NIST · AI Risk Management Framework 1.0",
    url: "https://www.nist.gov/itl/ai-risk-management-framework",
    publishedAt: "2023-01-26", fetchedAt: REVIEWED_AT,
    scope: "US voluntary framework · usable internationally; original 1.0 release, revision in progress",
    kind: "policy",
    limitation: "Practice guidance, not labor-demand evidence or a hiring forecast. We infer relevance to AI operations and cyber risk work.",
    roleIds: ["ai-operations-specialist", "cyber-risk-coordinator"],
    skills: ["AI output evaluation", "AI risk assessment"], weight: 2,
  },
];

const NEWS_MAPPINGS = [
  { pattern: /agents|automation|copilots|generative/i, roles: ["ai-operations-specialist"], skills: ["AI output evaluation"] },
  { pattern: /safety|regulation|governance/i, roles: ["cyber-risk-coordinator"], skills: ["AI risk assessment"] },
  { pattern: /business|productivity|workforce|skills/i, roles: ["business-intelligence-analyst", "customer-success-operations-lead"], skills: ["Data quality"] },
];

export function mapNewsSignals(feed: LiveTrendsResponse, now = new Date()): CareerSignal[] {
  return feed.trends.flatMap((trend, index) => {
    // Unknown, future or old coverage is not used to adjust a recommendation.
    const age = now.getTime() - new Date(trend.publishedAt).getTime();
    const mapping = NEWS_MAPPINGS.find((rule) => rule.pattern.test(trend.topic));
    if (!mapping || !Number.isFinite(age) || age < 0 || age > 30 * 86_400_000) return [];
    return [{
      id: `news-${index}-${new Date(trend.publishedAt).toISOString().slice(0, 10)}`,
      title: trend.headline, source: trend.sourceName, url: trend.articleUrl,
      publishedAt: new Date(trend.publishedAt).toISOString(), fetchedAt: new Date(feed.fetchedAt).toISOString(),
      scope: "English-language Google News US edition · article geography not independently verified",
      kind: "news" as const,
      limitation: "Topic classified from headline/summary. News mentions are not job demand; counts never enter the score. At most 2 news points per role. Mapping is an editorial hypothesis.",
      roleIds: mapping.roles, skills: mapping.skills, weight: 1,
    }];
  });
}

export function curatedEvidence(newsStatus = "Read-only demo: reviewed public evidence only; no live news requested."): EvidenceSnapshot {
  return { signals: structuredClone(PUBLIC_SIGNALS), newsStatus, fetchedAt: REVIEWED_AT };
}

export async function getCareerEvidence(
  loadNews: () => Promise<LiveTrendsResponse> = getLiveTrends,
): Promise<EvidenceSnapshot> {
  try {
    const feed = await loadNews();
    const news = mapNewsSignals(feed);
    return {
      signals: [...structuredClone(PUBLIC_SIGNALS), ...news],
      newsStatus: news.length
        ? "Live news mapped as weak context only; maximum 2 points per role, independent of mention counts."
        : "Live feed loaded, but no recent topics matched the explicit role mappings; reviewed evidence only.",
      fetchedAt: new Date(feed.fetchedAt).toISOString(),
    };
  } catch {
    return curatedEvidence("Live news unavailable. Using dated, reviewed public evidence only; this is not a live labor-market feed.");
  }
}

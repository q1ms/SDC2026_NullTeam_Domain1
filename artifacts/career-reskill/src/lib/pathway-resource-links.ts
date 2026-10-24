export type LearningResource =
  | { available: true; href: string; label: string }
  | { available: false; reason: string };

const SEARCH_PATTERN = /(\/results\?|\/search\b|[?&](q|query|search_query)=)/i;

export function getLearningResourceLink(resourceLink?: string, resourceTitle?: string): LearningResource {
  const candidate = typeof resourceLink === "string" ? resourceLink.trim() : "";
  if (!candidate) return { available: false, reason: "Resource link unavailable" };
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { available: false, reason: "Resource link unavailable (invalid link)" };
  }
  if (url.protocol !== "https:") return { available: false, reason: "Resource link unavailable (not a secure link)" };
  if (SEARCH_PATTERN.test(url.pathname + url.search)) {
    return { available: false, reason: "Resource link unavailable (search page, not a direct resource)" };
  }
  return { available: true, href: url.toString(), label: resourceTitle?.trim() || url.hostname };
}

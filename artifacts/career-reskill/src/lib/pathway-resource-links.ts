export function getLearningResourceLink(step: string, resourceLink?: string) {
  const candidate = typeof resourceLink === "string" ? resourceLink.trim() : "";
  const hasUnsafeScheme = /^[a-z][a-z\d+.-]*:/i.test(candidate)
    && !/^https?:/i.test(candidate);

  return candidate && !hasUnsafeScheme
    ? { href: candidate, label: "View resource" }
    : {
      href: `https://www.youtube.com/results?search_query=${encodeURIComponent(step)}`,
      label: "Search resources",
    };
}

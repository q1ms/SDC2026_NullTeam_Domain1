const TRUSTED_LEARNING_DOMAINS = [
  "coursera.org",
  "edx.org",
  "freecodecamp.org",
  "youtube.com",
  "youtu.be",
  "khanacademy.org",
];

export function isAllowedLearningResourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && TRUSTED_LEARNING_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export function getLearningResourceLink(step: string, resourceLink?: string) {
  return isAllowedLearningResourceUrl(resourceLink)
    ? { href: resourceLink, label: "View resource" }
    : {
        href: `https://www.youtube.com/results?search_query=${encodeURIComponent(step)}`,
        label: "Search resources",
      };
}

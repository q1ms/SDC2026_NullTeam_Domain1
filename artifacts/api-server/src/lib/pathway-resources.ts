const TRUSTED_LEARNING_DOMAINS = [
  "coursera.org",
  "edx.org",
  "freecodecamp.org",
  "youtube.com",
  "youtu.be",
  "khanacademy.org",
];

export function isPathwayResourceUrl(value: unknown): value is string {
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

export function hasPathwayResourceLinks(output: unknown): boolean {
  if (!isRecord(output) || !Array.isArray(output.scenarios) || output.scenarios.length !== 3) return false;
  return output.scenarios.every((scenario) =>
    isRecord(scenario)
    && Array.isArray(scenario.reskillingPathway)
    && scenario.reskillingPathway.length === 3
    && scenario.reskillingPathway.every((step) =>
      isRecord(step) && isPathwayResourceUrl(step.resourceLink),
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

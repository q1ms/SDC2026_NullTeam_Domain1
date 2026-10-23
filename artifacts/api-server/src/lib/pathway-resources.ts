export function normalizePathwayResourceLinks(output: unknown): unknown {
  if (!isRecord(output) || !Array.isArray(output.scenarios)) return output;

  return {
    ...output,
    scenarios: output.scenarios.map((scenario) => {
      if (!isRecord(scenario) || !Array.isArray(scenario.reskillingPathway)) return scenario;

      return {
        ...scenario,
        reskillingPathway: scenario.reskillingPathway.map((step) => {
          if (!isRecord(step)) return step;
          const resourceLink = step.resourceLink;
          if (typeof resourceLink === "string" && resourceLink.trim().length > 0) return step;

          const description = typeof step.step === "string"
            ? step.step
            : typeof step.description === "string"
              ? step.description
              : "career learning skills";

          return {
            ...step,
            resourceLink: `https://www.youtube.com/results?search_query=${encodeURIComponent(description)}`,
          };
        }),
      };
    }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

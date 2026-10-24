export function interestsFromProfileSummary(summary?: string): string[] {
  const match = summary?.match(/\bInterests:\s*(.*?)(?:\.|$)/i);
  return match?.[1]
    .split(",")
    .map((interest) => interest.trim())
    .filter(Boolean) ?? [];
}

export function getPivotInterests(profileInterests: string[] | undefined, explainableReason?: string): string[] {
  const reasonMatches = explainableReason?.match(/interests in (.+?) informs this option/i)?.[1]
    .split(",")
    .map((interest) => interest.trim())
    .filter((interest) => interest && interest.toLowerCase() !== "no direct interest match") ?? [];
  const candidates = profileInterests?.length ? profileInterests : reasonMatches;
  if (!candidates.length) return [];

  const matched = explainableReason
    ? candidates.filter((interest) => explainableReason.toLowerCase().includes(interest.toLowerCase()))
    : [];
  return (matched.length ? matched : candidates).slice(0, 2);
}

export function getPersonalizedSdgNumbers(tags: readonly string[]): Set<number> {
  return new Set(tags.flatMap((tag) => {
    const match = /^SDG\s*(\d{1,2})\b/i.exec(tag.trim());
    if (!match) return [];
    const number = Number(match[1]);
    return number >= 1 && number <= 17 ? [number] : [];
  }));
}

export function prioritizeSdgMappings<T extends { number: number }>(
  goals: readonly T[],
  personalizedNumbers: ReadonlySet<number>,
): T[] {
  return [...goals].sort((left, right) => {
    const personalizationOrder =
      Number(personalizedNumbers.has(right.number)) - Number(personalizedNumbers.has(left.number));
    return personalizationOrder || left.number - right.number;
  });
}

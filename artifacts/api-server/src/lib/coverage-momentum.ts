const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Equal rolling windows in the returned RSS sample, never a labor-market signal. */
export function summarizeCoverage(topicDates: Date[], sampleDates: Date[], now: Date) {
  const end = now.getTime();
  const recentStart = end - WEEK_MS;
  const previousStart = recentStart - WEEK_MS;
  const inPrevious = (date: Date) => date.getTime() >= previousStart && date.getTime() < recentStart;
  return {
    recentCount: topicDates.filter((date) => date.getTime() >= recentStart && date.getTime() <= end).length,
    previousCount: topicDates.filter(inPrevious).length,
    // An empty older part of a capped feed cannot substantiate a growth claim.
    baselineAvailable: sampleDates.some(inPrevious),
  };
}

import type { LiveTrend } from "@workspace/api-client-react";
import type { CareerProfile } from "../data/catalog";

const STOP_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function getReadingTerms(profile: CareerProfile): string[] {
  const terms = new Map<string, string>();
  for (const value of [profile.industry, profile.currentRole, ...profile.interests]) {
    const normalized = normalize(value);
    if (normalized && !terms.has(normalized)) terms.set(normalized, value.trim());
  }
  return [...terms.values()];
}

/** Filter the live feed locally; never substitute unrelated stories for a match. */
export function selectPersonalizedCoverage(articles: LiveTrend[], profile: CareerProfile): LiveTrend[] {
  const terms = getReadingTerms(profile).map((term) => {
    const phrase = normalize(term);
    const tokens = [...new Set(phrase.split(" ").filter((token) => token.length >= 2 && !STOP_WORDS.has(token)))];
    return { phrase, tokens };
  });
  const ranked = articles.map((article) => {
    const text = ` ${normalize(`${article.topic} ${article.headline} ${article.summary}`)} `;
    const words = new Set(text.trim().split(" "));
    const score = terms.reduce((total, term) => {
      const matched = term.tokens.filter((token) => words.has(token)).length;
      return total + matched + (matched > 0 && text.includes(` ${term.phrase} `) ? 3 : 0);
    }, 0);
    return { article, score };
  }).filter(({ score }) => score > 0).sort((left, right) =>
    right.score - left.score ||
    (Date.parse(right.article.publishedAt) || 0) - (Date.parse(left.article.publishedAt) || 0),
  );
  const seen = new Set<string>();
  return ranked.filter(({ article }) => {
    if (seen.has(article.articleUrl)) return false;
    seen.add(article.articleUrl);
    return true;
  }).slice(0, 5).map(({ article }) => article);
}

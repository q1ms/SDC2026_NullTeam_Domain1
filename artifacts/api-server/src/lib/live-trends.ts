import { XMLParser } from "fast-xml-parser";
import type { LiveTrend, LiveTrendsResponse } from "@workspace/api-zod";
import { resolveGoogleNewsImageUrl } from "./article-images";

const FEED_URL =
  "https://news.google.com/rss/search?q=AI+jobs+OR+AI+skills+OR+AI+workplace+automation+when%3A30d&hl=en-US&gl=US&ceid=US:en";
const CACHE_DURATION_MS = 10 * 60 * 1000;
const MAX_FEED_BYTES = 2_000_000;
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  trimValues: true,
});

const TOPIC_RULES = [
  {
    topic: "AI agents & workflow automation",
    patterns: [/\b(ai agents?|agentic|autonomous agents?|multi-agent)\b/i, /\bworkflow automation\b/i],
  },
  {
    topic: "Generative AI & copilots",
    patterns: [/\b(generative ai|genai|llms?|chatgpt|copilots?)\b/i],
  },
  {
    topic: "AI skills & workforce shifts",
    patterns: [
      /\b(ai|artificial intelligence)\b.{0,45}\b(jobs?|skills?|workforce|workers?|reskilling|upskilling)\b/i,
      /\b(reskilling|upskilling|workforce|workers?)\b.{0,45}\b(ai|artificial intelligence)\b/i,
    ],
  },
  {
    topic: "AI safety & regulation",
    patterns: [
      /\b(ai|artificial intelligence)\b.{0,45}\b(regulation|safety|governance|policy|risk)\b/i,
      /\b(regulation|safety|governance|policy)\b.{0,45}\b(ai|artificial intelligence)\b/i,
    ],
  },
  {
    topic: "AI infrastructure & chips",
    patterns: [/\b(gpus?|chips?|data centers?|compute infrastructure)\b/i],
  },
  {
    topic: "AI in healthcare",
    patterns: [/\b(healthcare|medical|clinical|drug discovery)\b/i],
  },
  {
    topic: "AI in education",
    patterns: [/\b(education|classrooms?|students|teachers|learning)\b/i],
  },
  {
    topic: "Robotics & autonomous systems",
    patterns: [/\b(robotics?|autonomous driving|self-driving|humanoid robots?)\b/i],
  },
  {
    topic: "AI in business & productivity",
    patterns: [/\b(enterprise|business productivity|workplace productivity)\b/i],
  },
] as const;

type FeedArticle = {
  title: string;
  summary: string;
  sourceName: string;
  articleUrl: string;
  publishedAt: Date;
};

type TopicAccumulator = {
  mentions: number;
  article: FeedArticle;
};

let cachedResponse: LiveTrendsResponse | undefined;
let cacheExpiresAt = 0;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function readText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const record = asRecord(value);
  const text = record["#text"] ?? record.__cdata;
  return typeof text === "string" || typeof text === "number" ? String(text) : "";
}

function cleanHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_match, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseArticle(item: unknown): FeedArticle | null {
  const record = asRecord(item);
  const title = cleanHtml(readText(record.title));
  const rawUrl = readText(record.link);
  if (!title || !rawUrl) return null;

  let articleUrl: string;
  try {
    const parsedUrl = new URL(rawUrl);
    if (parsedUrl.protocol !== "https:") return null;
    articleUrl = parsedUrl.toString();
  } catch {
    return null;
  }

  const dateText = readText(record.pubDate);
  const parsedDate = dateText ? new Date(dateText) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) return null;
  const sourceName =
    cleanHtml(readText(record.source)) || new URL(articleUrl).hostname.replace(/^www\./, "");

  return {
    title,
    summary: cleanHtml(readText(record.description)).slice(0, 320) || title,
    sourceName,
    articleUrl,
    publishedAt: parsedDate,
  };
}

function articleTime(article: FeedArticle): number {
  return article.publishedAt.getTime();
}

function toLiveTrend(topic: string, value: TopicAccumulator): LiveTrend {
  return {
    topic,
    mentions: value.mentions,
    headline: value.article.title,
    summary: value.article.summary,
    sourceName: value.article.sourceName,
    articleUrl: value.article.articleUrl,
    publishedAt: value.article.publishedAt,
  };
}

function matchIndex(text: string, patterns: readonly RegExp[]): number | null {
  const indexes = patterns
    .map((pattern) => pattern.exec(text)?.index)
    .filter((index): index is number => index !== undefined);
  return indexes.length ? Math.min(...indexes) : null;
}

function classifyArticle(article: FeedArticle): string | null {
  for (const text of [article.title, article.summary]) {
    const match = TOPIC_RULES
      .map((rule, order) => ({ topic: rule.topic, order, index: matchIndex(text, rule.patterns) }))
      .filter((candidate) => candidate.index !== null)
      .sort(
        (left, right) =>
          (left.index ?? Number.POSITIVE_INFINITY) -
            (right.index ?? Number.POSITIVE_INFINITY) ||
          left.order - right.order,
      )[0];

    if (match) return match.topic;
  }
  return null;
}

function buildTopics(articles: FeedArticle[]): LiveTrend[] {
  const topics = new Map<string, TopicAccumulator>();

  for (const article of articles) {
    const topic = classifyArticle(article);
    if (!topic) continue;

    const current = topics.get(topic);
    if (!current) {
      topics.set(topic, { mentions: 1, article });
    } else {
      current.mentions += 1;
      if (articleTime(article) > articleTime(current.article)) {
        current.article = article;
      }
    }
  }

  const ranked = [...topics.entries()]
    .sort(
      ([, left], [, right]) =>
        right.mentions - left.mentions ||
        articleTime(right.article) - articleTime(left.article),
    )
    .slice(0, 5)
    .map(([topic, value]) => toLiveTrend(topic, value));

  const usedLabels = new Set(ranked.map((trend) => trend.topic.toLowerCase()));
  const usedArticleUrls = new Set(ranked.map((trend) => trend.articleUrl));
  for (const article of articles) {
    if (ranked.length >= 5) break;
    if (usedArticleUrls.has(article.articleUrl)) continue;
    const headlineTopic = article.title.replace(/\s+-\s+[^-]+$/, "").trim().slice(0, 110);
    if (!headlineTopic || usedLabels.has(headlineTopic.toLowerCase())) continue;

    usedLabels.add(headlineTopic.toLowerCase());
    usedArticleUrls.add(article.articleUrl);
    ranked.push(toLiveTrend(headlineTopic, { mentions: 1, article }));
  }

  if (ranked.length < 5) {
    throw new Error("The news feed returned fewer than five usable AI topics");
  }
  return ranked;
}

export async function getLiveTrends(): Promise<LiveTrendsResponse> {
  if (cachedResponse && Date.now() < cacheExpiresAt) return cachedResponse;

  const response = await fetch(FEED_URL, {
    headers: { "user-agent": "CareerReskillingDashboard/1.0 (public RSS reader)" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`AI news RSS feed returned HTTP ${response.status}`);
  }

  const xml = await response.text();
  if (xml.length > MAX_FEED_BYTES) {
    throw new Error("AI news RSS feed exceeded the response size limit");
  }

  const feed = asRecord(parser.parse(xml));
  const channel = asRecord(asRecord(feed.rss).channel);
  const articles = asList(channel.item)
    .map(parseArticle)
    .filter((article): article is FeedArticle => article !== null)
    .sort((left, right) => articleTime(right) - articleTime(left));

  if (articles.length === 0) {
    throw new Error("AI news RSS feed contained no usable articles");
  }

  const trends = await Promise.all(buildTopics(articles).map(async (trend) => {
    const imageUrl = await resolveGoogleNewsImageUrl(trend.articleUrl);
    return imageUrl ? { ...trend, imageUrl } : trend;
  }));
  const result: LiveTrendsResponse = {
    source: "Google News RSS",
    feedUrl: FEED_URL,
    fetchedAt: new Date(),
    trends,
  };

  cachedResponse = result;
  cacheExpiresAt = Date.now() + CACHE_DURATION_MS;
  return result;
}

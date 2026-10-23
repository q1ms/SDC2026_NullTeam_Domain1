import { ExternalLink } from "lucide-react";
import type { LiveTrend } from "@workspace/api-client-react";

export function CoverageList({
  articles,
  rowTestIdPrefix = "row-skill-trend",
  linkTestIdPrefix = "link-trend-source",
}: {
  articles: LiveTrend[];
  rowTestIdPrefix?: string;
  linkTestIdPrefix?: string;
}) {
  return (
    <div className="coverage-list">
      {articles.map((article, index) => (
        <article className="coverage-item" key={`${article.topic}-${article.articleUrl}`} data-testid={`${rowTestIdPrefix}-${index}`}>
          <div className="coverage-copy">
            <div className="coverage-topic">
              <span className="topic-badge">{article.topic}</span>
              <span className="coverage-count">{article.mentions} {article.mentions === 1 ? "story" : "stories"}</span>
            </div>
            <a className="coverage-headline" href={article.articleUrl} target="_blank" rel="noopener noreferrer" data-testid={`${linkTestIdPrefix}-${index}`}>
              {article.headline}<ExternalLink size={13} aria-hidden="true" />
            </a>
            <p>{article.summary}</p>
            <div className="coverage-meta">
              <span>{article.sourceName}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={article.publishedAt}>{formatPublishedAt(article.publishedAt)}</time>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatPublishedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

import { ExternalLink } from "lucide-react";
import { useState } from "react";
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
        <CoverageItem
          key={`${article.topic}-${article.articleUrl}`}
          article={article}
          index={index}
          rowTestIdPrefix={rowTestIdPrefix}
          linkTestIdPrefix={linkTestIdPrefix}
        />
      ))}
    </div>
  );
}

function CoverageItem({
  article,
  index,
  rowTestIdPrefix,
  linkTestIdPrefix,
}: {
  article: LiveTrend;
  index: number;
  rowTestIdPrefix: string;
  linkTestIdPrefix: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = safeImageUrl(article.imageUrl);
  const showImage = Boolean(imageUrl && !imageFailed);

  return (
    <article className={`coverage-item${showImage ? " has-image" : ""}`} data-testid={`${rowTestIdPrefix}-${index}`}>
      {showImage && (
        <img
          className="coverage-image"
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          data-testid={`image-coverage-${index}`}
        />
      )}
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
  );
}

function safeImageUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function formatPublishedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

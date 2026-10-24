const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i;
export const FALLBACK_ARTICLE_IMAGE_URL =
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500&q=80";

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

function safeHttpsImageUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim().replace(/&amp;/gi, "&"));
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function imageAttribute(value: unknown): string {
  const record = asRecord(value);
  return readText(record["@_url"] ?? record["@_href"] ?? record.url ?? record.href);
}

function looksLikeImage(record: Record<string, unknown>, url: string): boolean {
  const mediaType = readText(record["@_type"] ?? record.type).toLowerCase();
  const medium = readText(record["@_medium"] ?? record.medium).toLowerCase();
  return medium === "image" || mediaType.startsWith("image/") || IMAGE_EXTENSION.test(url);
}

export function extractRssImageUrl(item: unknown): string | undefined {
  const record = asRecord(item);
  const candidates = [
    ...asList(record["media:thumbnail"]).map((node) => ({ node, alwaysImage: true })),
    ...asList(record["media:content"]).map((node) => ({ node, alwaysImage: false })),
    ...asList(record.enclosure).map((node) => ({ node, alwaysImage: false })),
  ];

  for (const { node, alwaysImage } of candidates) {
    const metadata = asRecord(node);
    const url = imageAttribute(node);
    if (url && (alwaysImage || looksLikeImage(metadata, url))) {
      const safeUrl = safeHttpsImageUrl(url);
      if (safeUrl) return safeUrl;
    }
  }

  const description = readText(record.description);
  const imageSource = description.match(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
  return imageSource ? safeHttpsImageUrl(imageSource) : undefined;
}

export function resolveRssImageUrl(item: unknown): string {
  return extractRssImageUrl(item) ?? FALLBACK_ARTICLE_IMAGE_URL;
}

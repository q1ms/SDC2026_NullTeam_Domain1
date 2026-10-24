const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i;
export const FALLBACK_ARTICLE_IMAGE_URLS = {
  "AI skills & workforce shifts":
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80",
  "AI agents & workflow automation":
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=500&q=80",
  "Generative AI & copilots":
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500&q=80",
  "AI safety & regulation":
    "https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=500&q=80",
  "AI infrastructure & chips":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80",
  "AI in healthcare":
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&q=80",
  "AI in education":
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&q=80",
  "Robotics & autonomous systems":
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&q=80",
  "AI in business & productivity":
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&q=80",
} as const;

const FALLBACK_IMAGE_URLS = Object.values(FALLBACK_ARTICLE_IMAGE_URLS);
export const FALLBACK_ARTICLE_IMAGE_URL = FALLBACK_ARTICLE_IMAGE_URLS["Generative AI & copilots"];

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
  const directImage = safeHttpsImageUrl(readText(record.imageUrl));
  if (directImage) return directImage;

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

export function getTopicFallbackImageUrl(
  topic: string,
  usedFallbackImages: Set<string> = new Set(),
): string {
  const preferred = FALLBACK_ARTICLE_IMAGE_URLS[topic as keyof typeof FALLBACK_ARTICLE_IMAGE_URLS]
    ?? FALLBACK_ARTICLE_IMAGE_URL;
  const startIndex = FALLBACK_IMAGE_URLS.indexOf(preferred);

  for (let offset = 0; offset < FALLBACK_IMAGE_URLS.length; offset += 1) {
    const candidate = FALLBACK_IMAGE_URLS[(startIndex + offset) % FALLBACK_IMAGE_URLS.length];
    if (!usedFallbackImages.has(candidate)) {
      usedFallbackImages.add(candidate);
      return candidate;
    }
  }

  return preferred;
}

export function resolveRssImageUrl(
  item: unknown,
  topic: string,
  usedFallbackImages: Set<string>,
): string {
  return extractRssImageUrl(item) ?? getTopicFallbackImageUrl(topic, usedFallbackImages);
}

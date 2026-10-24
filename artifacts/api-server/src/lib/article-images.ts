const GOOGLE_NEWS_HOST = "news.google.com";
const ARTICLE_IMAGE_TIMEOUT_MS = 2_000;
const MAX_ARTICLE_HTML_BYTES = 768_000;
const MAX_REDIRECTS = 2;

function safeImageUrl(value: string, baseUrl: string): string | undefined {
  try {
    const url = new URL(value.trim().replace(/&amp;/gi, "&"), baseUrl);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function extractOpenGraphImageUrl(html: string, baseUrl = "https://news.google.com/"): string | undefined {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const property = tag.match(/\b(?:property|name)\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase();
    if (property !== "og:image" && property !== "og:image:url") continue;
    const content = tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!content) continue;
    const imageUrl = safeImageUrl(content, baseUrl);
    if (imageUrl) return imageUrl;
  }
  return undefined;
}

async function readHtmlWithinLimit(response: Response): Promise<string | undefined> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ARTICLE_HTML_BYTES) {
    await response.body?.cancel();
    return undefined;
  }

  const reader = response.body?.getReader();
  if (!reader) return undefined;
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let html = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_ARTICLE_HTML_BYTES) {
        await reader.cancel();
        return undefined;
      }
      html += decoder.decode(value, { stream: true });
    }
    return html + decoder.decode();
  } catch {
    return undefined;
  } finally {
    reader.releaseLock();
  }
}

export async function resolveGoogleNewsImageUrl(
  articleUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | undefined> {
  let current: URL;
  try {
    current = new URL(articleUrl);
  } catch {
    return undefined;
  }
  if (current.protocol !== "https:" || current.hostname !== GOOGLE_NEWS_HOST || current.username || current.password) {
    return undefined;
  }

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    let response: Response;
    try {
      response = await fetchImpl(current.toString(), {
        headers: { "user-agent": "CareerReskillingDashboard/1.0 (public RSS reader)" },
        redirect: "manual",
        signal: AbortSignal.timeout(ARTICLE_IMAGE_TIMEOUT_MS),
      });
    } catch {
      return undefined;
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location || redirects === MAX_REDIRECTS) return undefined;
      try {
        const next = new URL(location, current);
        if (next.protocol !== "https:" || next.hostname !== GOOGLE_NEWS_HOST || next.username || next.password) {
          return undefined;
        }
        current = next;
        continue;
      } catch {
        return undefined;
      }
    }

    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
      await response.body?.cancel().catch(() => undefined);
      return undefined;
    }

    const html = await readHtmlWithinLimit(response);
    return html ? extractOpenGraphImageUrl(html, current.toString()) : undefined;
  }

  return undefined;
}

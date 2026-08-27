export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function cleanUrl(rawUrl: string): string {
  let result = rawUrl;
  try {
    const u = new URL(result, "https://duckduckgo.com");
    result = u.searchParams.get("uddg") || result;
  } catch {
    // ignore
  }
  return result;
}

function extractResults(html: string, max: number): SearchResult[] {
  const results: SearchResult[] = [];

  const primaryRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  const blockRegex = /<div[^>]*class="result__body"[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h2[^>]*>(.*?)<\/h2>[\s\S]*?<span[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/span>/gi;

  let match;
  while ((match = primaryRegex.exec(html)) !== null && results.length < max) {
    const title = match[2].replace(/<[^>]*>/g, "").trim();
    if (title && results.length < max) {
      results.push({ title, url: cleanUrl(match[1]), snippet: match[3].replace(/<[^>]*>/g, "").trim().replace(/\s+/g, " ") });
    }
  }

  if (results.length === 0) {
    while ((match = blockRegex.exec(html)) !== null && results.length < max) {
      const title = match[2].replace(/<[^>]*>/g, "").trim();
      if (title && results.length < max) {
        results.push({ title, url: cleanUrl(match[1]), snippet: match[3].replace(/<[^>]*>/g, "").trim().replace(/\s+/g, " ") });
      }
    }
  }

  // Generic fallback: scan for <a class starts not caught above.
  if (results.length === 0) {
    const genericRegex = /<a[^>]*href="([^"]*)"[^>]*rel="nofollow"[^>]*>(.*?)<\/a>/gi;
    while ((match = genericRegex.exec(html)) !== null && results.length < max) {
      const href = match[1];
      if (!href || href.startsWith("#") || href.startsWith("/") || href === "") continue;
      const title = match[2].replace(/<[^>]*>/g, "").trim();
      if (title) {
        results.push({ title, url: cleanUrl(href), snippet: "" });
      }
    }
  }

  return results.filter((r) => r.url.startsWith("http"));
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url, 8000);
    const html = await res.text();
    return extractResults(html, 5);
  } catch {
    return [];
  }
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "";

  const formatted = results
    .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`)
    .join("\n\n");

  return `Here are real-time web search results. Use them to answer the user:\n\n${formatted}`;
}

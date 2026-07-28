export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const html = await res.text();

    const results: SearchResult[] = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < 5) {
      let rawUrl = match[1];
      try {
        const u = new URL(rawUrl, "https://duckduckgo.com");
        rawUrl = u.searchParams.get("uddg") || rawUrl;
      } catch {}

      const title = match[2].replace(/<[^>]*>/g, "").trim();
      const snippet = match[3].replace(/<[^>]*>/g, "").trim();

      if (title && rawUrl) {
        results.push({ title, url: rawUrl, snippet });
      }
    }

    if (results.length === 0) {
      const blockRegex = /<div[^>]*class="result__body"[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h2[^>]*>(.*?)<\/h2>[\s\S]*?<span[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/span>/gi;
      while ((match = blockRegex.exec(html)) !== null && results.length < 5) {
        let rawUrl = match[1];
        try {
          const u = new URL(rawUrl, "https://duckduckgo.com");
          rawUrl = u.searchParams.get("uddg") || rawUrl;
        } catch {}

        const title = match[2].replace(/<[^>]*>/g, "").trim();
        const snippet = match[3].replace(/<[^>]*>/g, "").trim();

        if (title && rawUrl) {
          results.push({ title, url: rawUrl, snippet });
        }
      }
    }

    return results;
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

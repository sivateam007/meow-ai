import { search, SafeSearchType } from "duck-duck-scrape";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  try {
    const results = await search(query, {
      safeSearch: SafeSearchType.STRICT,
    });

    return results.results.slice(0, 5).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
    }));
  } catch {
    return [];
  }
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "";

  const formatted = results
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`)
    .join("\n\n");

  return `Web search results:\n${formatted}`;
}

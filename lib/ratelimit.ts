interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 60;

const hits = new Map<string, RateLimitEntry>();

export function rateLimit(
  key: string,
  max = MAX_REQUESTS,
  windowMs = WINDOW_MS
): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    hits.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

const CLEANUP_INTERVAL = 10 * 60 * 1000;
const timer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now - entry.windowStart >= WINDOW_MS) hits.delete(key);
  }
}, CLEANUP_INTERVAL);
if (typeof timer.unref === "function") timer.unref();

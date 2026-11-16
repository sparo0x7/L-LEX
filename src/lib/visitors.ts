/**
 * Global visitor counter backed by the Vercel serverless endpoint at
 * /api/visitors (Upstash Redis). The endpoint deduplicates by an HttpOnly
 * cookie, so this is a unique-visitor count rather than a page-view count.
 * The counter stays hidden if the API is unavailable.
 */
let countPromise: Promise<number | null> | null = null;

export function formatVisitorCount(count: number): string {
  return new Intl.NumberFormat('en-US').format(count);
}

export function getVisitorCount(): Promise<number | null> {
  countPromise ??= fetch('/api/visitors', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = (await response.json()) as { count?: unknown };
      return typeof data.count === 'number' && Number.isFinite(data.count) ? data.count : null;
    })
    .catch(() => null);
  return countPromise;
}

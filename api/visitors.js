/* global process, crypto */
import { Redis } from '@upstash/redis';

const KEY = 'llex:visitors';
const BASELINE = 2123;
const COOKIE = 'llex_vid';
const ONE_YEAR = 60 * 60 * 24 * 365;

function redisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function toCount(value) {
  const count = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(count) && count >= BASELINE ? count : BASELINE;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const redis = redisClient();
  if (!redis) {
    res.status(503).json({ error: 'visitor_counter_not_configured' });
    return;
  }

  try {
    let count;
    if (readCookie(req, COOKIE)) {
      count = toCount(await redis.get(KEY));
    } else {
      await redis.set(KEY, BASELINE, { nx: true });
      count = toCount(await redis.incr(KEY));
      const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
      res.setHeader(
        'Set-Cookie',
        `${COOKIE}=${crypto.randomUUID()}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax; HttpOnly${secure}`,
      );
    }
    res.status(200).json({ count });
  } catch {
    res.status(502).json({ error: 'visitor_counter_unavailable' });
  }
}

import Redis from "ioredis";

const getRedisClient = () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("REDIS_URL not set — using in-memory fallback for development");
    return null;
  }
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      return Math.min(times * 50, 2000);
    },
  });
};

export const redis = getRedisClient();

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!redis) return;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}

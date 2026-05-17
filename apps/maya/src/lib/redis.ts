import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const CACHE_KEYS = {
  persona: (id: string) => `persona:${id}`,
  userSession: (userId: string) => `session:${userId}`,
  userMemories: (userId: string, personaId: string) =>
    `memories:${userId}:${personaId}`,
  feedPosts: (personaId: string, page: number) =>
    `feed:${personaId}:${page}`,
  dashboardStats: () => "dashboard:stats",
  rateLimitChat: (userId: string) => `ratelimit:chat:${userId}`,
  rateLimitVoice: (userId: string) => `ratelimit:voice:${userId}`,
  messageQuota: (userId: string) => `quota:${userId}`,
} as const;

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached) return cached;
  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

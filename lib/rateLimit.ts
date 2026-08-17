import { isRedisConfigured, getAppConfig } from "@/lib/config";

type RateLimitRecord = { count: number; resetAt: number };
const memoryStore = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  check(key: string, limit: number, windowMs: number): RateLimitResult | Promise<RateLimitResult>;
}

class MemoryRateLimitStore implements RateLimitStore {
  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const record = memoryStore.get(key);

    if (!record || now > record.resetAt) {
      memoryStore.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (record.count >= limit) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    record.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

class RedisDistributedRateLimitStore implements RateLimitStore {
  private fallbackStore = new MemoryRateLimitStore();

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const cfg = getAppConfig();
    const restUrl = cfg.upstashRedisRestUrl || (cfg.redisUrl && cfg.redisUrl.startsWith("http") ? cfg.redisUrl : null);
    const token = cfg.upstashRedisRestToken;

    if (!restUrl || !token) {
      // In local execution without Upstash HTTP REST keys, fallback to memory store seamlessly
      return this.fallbackStore.check(`redis:${key}`, limit, windowMs);
    }

    try {
      const windowSeconds = Math.ceil(windowMs / 1000);
      const pipelineUrl = `${restUrl.replace(/\/$/, "")}/pipeline`;

      const response = await fetch(pipelineUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", `rate:${key}`],
          ["EXPIRE", `rate:${key}`, windowSeconds, "NX"],
          ["TTL", `rate:${key}`],
        ]),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Upstash REST HTTP Error ${response.status}`);
      }

      const results = await response.json();
      const currentCount = Number(results[0]?.result) || 1;
      const ttlSeconds = Number(results[2]?.result) || windowSeconds;

      if (currentCount > limit) {
        return {
          allowed: false,
          retryAfterSeconds: ttlSeconds > 0 ? ttlSeconds : windowSeconds,
        };
      }

      return { allowed: true, retryAfterSeconds: 0 };
    } catch (err: unknown) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("[RateLimit] Redis store check failed, falling back to memory store:", err instanceof Error ? err.message : err);
      }
      return this.fallbackStore.check(`redis:${key}`, limit, windowMs);
    }
  }
}

const memoryStoreInstance: RateLimitStore = new MemoryRateLimitStore();
const redisStoreInstance: RateLimitStore = new RedisDistributedRateLimitStore();

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (isRedisConfigured()) {
    return await redisStoreInstance.check(key, limit, windowMs);
  }
  return memoryStoreInstance.check(key, limit, windowMs);
}


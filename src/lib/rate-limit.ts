import "server-only";

type RateLimitBucket = {
  count: number;
  expiresAt: number;
};

declare global {
  var reserveeRateLimitStore: Map<string, RateLimitBucket> | undefined;
}

function getRateLimitStore() {
  if (!globalThis.reserveeRateLimitStore) {
    globalThis.reserveeRateLimitStore = new Map<string, RateLimitBucket>();
  }

  return globalThis.reserveeRateLimitStore;
}

export function consumeRateLimit(input: {
  key: string;
  windowMs: number;
  maxRequests: number;
}) {
  const store = getRateLimitStore();
  const now = Date.now();
  const existing = store.get(input.key);

  if (!existing || existing.expiresAt <= now) {
    store.set(input.key, {
      count: 1,
      expiresAt: now + input.windowMs,
    });

    return {
      allowed: true,
      remaining: input.maxRequests - 1,
      resetAt: now + input.windowMs,
    };
  }

  if (existing.count >= input.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.expiresAt,
    };
  }

  existing.count += 1;
  store.set(input.key, existing);

  return {
    allowed: true,
    remaining: Math.max(input.maxRequests - existing.count, 0),
    resetAt: existing.expiresAt,
  };
}

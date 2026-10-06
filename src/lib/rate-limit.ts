type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const PRUNE_AFTER = 10_000;

export function resetRateLimitBuckets() {
  buckets.clear();
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < PRUNE_AFTER) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  if (limit <= 0) return { allowed: true };

  const now = Date.now();
  pruneExpiredBuckets(now);
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { allowed: true };
}

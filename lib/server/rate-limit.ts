interface Bucket { count: number; resetAt: number }

const buckets = new Map<string, Bucket>();

export function rateLimit(identifier: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(identifier);
  if (!current || current.resetAt <= now) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (current.count >= limit) return { allowed: false, remaining: 0, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  current.count += 1;
  return { allowed: true, remaining: limit - current.count, retryAfter: 0 };
}

export function getRequestIdentifier(request: Request) {
  return request.headers.get("x-user-id")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "anonymous";
}

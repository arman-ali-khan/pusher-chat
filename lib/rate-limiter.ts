const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }

  const current = rateLimitMap.get(identifier);
  
  if (!current || current.resetTime < now) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true, remaining: limit - 1, resetTime: now + windowMs };
  }

  if (current.count >= limit) {
    return { success: false, remaining: 0, resetTime: current.resetTime };
  }

  current.count++;
  return { success: true, remaining: limit - current.count, resetTime: current.resetTime };
}
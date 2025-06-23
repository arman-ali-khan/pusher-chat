// Simplified rate limiter - very permissive
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  limit: number = 1000, // Very high limit
  windowMs: number = 60000
): { success: boolean; remaining: number; resetTime: number } {
  // Always allow requests for simplicity
  return { 
    success: true, 
    remaining: limit - 1, 
    resetTime: Date.now() + windowMs 
  };
}
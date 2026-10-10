import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const store = new Map<string, RateLimitRecord>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = store.get(ip);

    // Clean up expired
    if (!record || record.resetAt <= now) {
      store.set(ip, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    record.count++;
    if (record.count > options.maxRequests) {
      res.status(429).json({
        error: options.message || 'Too many requests. Please try again later.',
        retryAfterMs: record.resetAt - now,
      });
      return;
    }

    next();
  };
}

// Sensitive route rate limiters
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Upload rate limit exceeded. Please wait a minute before uploading another resume.',
});

export const emailLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  message: 'Email dispatch rate limit reached. Please wait before testing again.',
});

export const refreshLimiter = createRateLimiter({
  windowMs: 30 * 1000, // 30 seconds
  maxRequests: 10,
  message: 'Vacancy refresh rate limit reached. Please wait a moment.',
});

import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

// Create rate limiter instance
const rateLimiter = new RateLimiterMemory({
  points: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Number of requests
  duration: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900, // Per 15 minutes (in seconds)
});

export const rateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));

    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${secs} seconds.`,
      retryAfter: secs
    });
  }
};

export { rateLimiterMiddleware as rateLimiter };

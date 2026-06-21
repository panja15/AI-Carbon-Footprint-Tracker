import rateLimit from 'express-rate-limit';

// Rate limiter for Gemini Coach AI endpoint: limit to 10 requests per minute per IP
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too Many Requests',
    details: 'You have exceeded the rate limit for Gemini AI coach advice. Please try again after a minute.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

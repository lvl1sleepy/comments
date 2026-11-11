import { rateLimit } from "express-rate-limit";

interface RateLimiterOptions {
  limit?: number;
  windowMs?: number;
}

export function createGraphqlRateLimiter({
  limit = 10,
  windowMs = 60_000,
}: RateLimiterOptions = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    statusCode: 429,
    message: {
      error: "Too many GraphQL requests. Please try again later.",
    },
  });
}

export const graphqlRateLimiter = createGraphqlRateLimiter();

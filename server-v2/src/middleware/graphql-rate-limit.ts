import { rateLimit } from "express-rate-limit";

interface RateLimiterOptions {
  limit?: number;
  windowMs?: number;
}

export function createGraphqlRateLimiter({
  limit = 100,
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

function getConfiguredRateLimit(): number {
  const raw = process.env.GRAPHQL_RATE_LIMIT;

  if (raw === undefined) {
    return 100;
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error("GRAPHQL_RATE_LIMIT must be a positive integer");
  }

  return value;
}

export const graphqlRateLimiter = createGraphqlRateLimiter({
  limit: getConfiguredRateLimit(),
});

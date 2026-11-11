import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import { createGraphqlRateLimiter } from "../middleware/graphql-rate-limit.js";

test("blocks requests exceeding the rate limit", async () => {
  const app = express();
  let handlerCalls = 0;

  app.post(
    "/graphql",
    createGraphqlRateLimiter({
      limit: 3,
      windowMs: 60_000,
    }),
    (_req, res) => {
      handlerCalls++;
      res.status(200).json({ success: true });
    },
  );

  // First 3 requests should succeed.
  for (let i = 0; i < 3; i++) {
    const response = await request(app)
      .post("/graphql")
      .send({ query: "{ __typename }" });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
    });
  }

  assert.equal(handlerCalls, 3);

  // Fourth request should be blocked.
  const blocked = await request(app)
    .post("/graphql")
    .send({ query: "{ __typename }" });

  assert.equal(blocked.status, 429);

  assert.deepEqual(blocked.body, {
    error: "Too many GraphQL requests. Please try again later.",
  });

  // Rejected requests must not reach the handler.
  assert.equal(handlerCalls, 3);

  // Verify rate-limit response headers exist.
  assert.ok(blocked.headers["ratelimit"]);
  assert.ok(blocked.headers["retry-after"]);
});

test("rate limiting does not affect the health endpoint", async () => {
  const app = express();

  app.post(
    "/graphql",
    createGraphqlRateLimiter({
      limit: 1,
      windowMs: 60_000,
    }),
    (_req, res) => {
      res.status(200).json({ success: true });
    },
  );

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Exhaust the GraphQL rate limit.
  await request(app).post("/graphql").expect(200);
  await request(app).post("/graphql").expect(429);

  // Health checks must remain accessible.
  const health = await request(app).get("/health").expect(200);

  assert.deepEqual(health.body, {
    status: "ok",
  });
});

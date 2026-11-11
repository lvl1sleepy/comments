import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildAuthContext } from "../graphql/context.js";
import { signAccessToken } from "../auth/token.js";

test("missing authorization header returns null user", async () => {
  const context = await buildAuthContext(null);

  assert.equal(context.userId, null);
});

test("invalid JWT returns null user", async () => {
  const context = await buildAuthContext("Bearer invalid.jwt.token");

  assert.equal(context.userId, null);
});

test("unsupported authorization scheme is rejected", async () => {
  const context = await buildAuthContext("Basic some-credentials");

  assert.equal(context.userId, null);
});

test("valid JWT identifies the authenticated user", async () => {
  const token = await signAccessToken("101");

  const context = await buildAuthContext(`Bearer ${token}`);

  assert.equal(context.userId, "101");
});

test("different JWTs preserve their respective user IDs", async () => {
  const tokenA = await signAccessToken("101");
  const tokenB = await signAccessToken("202");

  const [contextA, contextB] = await Promise.all([
    buildAuthContext(`Bearer ${tokenA}`),
    buildAuthContext(`Bearer ${tokenB}`),
  ]);

  assert.equal(contextA.userId, "101");
  assert.equal(contextB.userId, "202");
});

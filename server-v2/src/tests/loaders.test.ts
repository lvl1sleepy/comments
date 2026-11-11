import test from "node:test";
import assert from "node:assert/strict";

import { createAuthorLoader } from "../graphql/loaders.js";
import type { CommentAuthorRow } from "../repositories/user.repository.js";

test("batches users and preserves order", async () => {
  const calls: string[][] = [];

  const fakeFindUsers = async (
    userIds: readonly string[],
  ): Promise<CommentAuthorRow[]> => {
    calls.push([...userIds]);

    // Deliberately return users in a different order.
    return [
      { id: "8", username: "Bob" },
      { id: "5", username: "Alice" },
    ];
  };

  const loader = createAuthorLoader(fakeFindUsers);

  const results = await Promise.all([
    loader.load("5"),
    loader.load("8"),
    loader.load("5"),
    loader.load("999"),
  ]);

  // Only one batch, with unique IDs.
  assert.deepEqual(calls, [["5", "8", "999"]]);

  // Results match the original requested order.
  assert.deepEqual(results, [
    { id: "5", username: "Alice" },
    { id: "8", username: "Bob" },
    { id: "5", username: "Alice" },
    null,
  ]);
});

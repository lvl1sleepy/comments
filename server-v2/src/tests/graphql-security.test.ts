import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, validate } from "graphql";

import { schema } from "../graphql/schema.js";

// Test 1: Ensure the unbounded recursive query is not exposed.
test("commentSubtree is not exposed publicly", () => {
  const query = parse(`
    query {
      commentSubtree(commentId: "1") {
        id
        content
      }
    }
  `);

  const errors = validate(schema, query);

  assert.ok(errors.length > 0, "Expected commentSubtree to be rejected");

  assert.ok(
    errors.some((error) =>
      /Cannot query field "commentSubtree"/.test(error.message),
    ),
    "Expected an unknown-field validation error",
  );
});

// Test 2: Ensure the supported paginated queries remain available.
test("topLevelComments and commentReplies are valid", () => {
  const query = parse(`
    query {
      topLevelComments(postId: "1", limit: 2) {
        hasNextPage
      }

      commentReplies(parentId: "1", limit: 2) {
        hasNextPage
      }
    }
  `);

  const errors = validate(schema, query);

  assert.deepEqual(
    errors.map((error) => error.message),
    [],
    "Expected both pagination queries to pass validation",
  );
});

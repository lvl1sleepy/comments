import "dotenv/config";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createYoga } from "graphql-yoga";

import type { GraphQLContext } from "../graphql/context.js";

const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl || new URL(testUrl).pathname !== "/comments_test") {
  throw new Error("Tests must use comments_test");
}

process.env.DATABASE_URL = testUrl;

const { pool } = await import("../db/pool.js");
const { schema } = await import("../graphql/schema.js");
const { buildAuthContext } = await import("../graphql/context.js");
const { createAuthorLoader } = await import("../graphql/loaders.js");
const { createSecurityPlugins } =
  await import("../graphql/security-plugins.js");

const yoga = createYoga<{}, GraphQLContext>({
  schema,
  plugins: createSecurityPlugins(),
  context: async ({ request }) => ({
    ...(await buildAuthContext(request.headers.get("authorization"))),
    loaders: {
      author: createAuthorLoader(),
    },
  }),
});

after(async () => {
  await pool.end();
});

async function executeGraphQL(
  query: string,
  variables: Record<string, unknown> = {},
) {
  const response = await yoga.fetch("http://localhost/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  return (await response.json()) as {
    data?: Record<string, any>;
    errors?: Array<{
      message: string;
      extensions?: { code?: string };
    }>;
  };
}

test("post queries support retrieval and cursor pagination", async () => {
  // Verify the actual PostgreSQL connection.
  const db = await pool.query<{ name: string }>(
    "SELECT current_database() AS name",
  );

  assert.equal(db.rows[0]?.name, "comments_test");

  const suffix = randomUUID().replaceAll("-", "");
  let userId: string | undefined;
  const postIds: string[] = [];

  try {
    // Create an author.
    const user = await pool.query<{ id: string }>(
      `
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [
        `posttest_${suffix.slice(0, 16)}`,
        `${suffix}@example.test`,
        "unused-test-hash",
      ],
    );

    userId = user.rows[0]!.id;

    // Insert three posts in order.
    for (const title of ["First", "Second", "Third"]) {
      const result = await pool.query<{ id: string }>(
        `
          INSERT INTO posts (author_id, title, content)
          VALUES ($1, $2, $3)
          RETURNING id
        `,
        [userId, title, `Content for ${title}`],
      );

      postIds.push(result.rows[0]!.id);
    }

    const [firstId, secondId, thirdId] = postIds;

    const listQuery = `
      query Posts($cursor: ID) {
        posts(limit: 2, afterId: $cursor) {
          items {
            id
            title
            author {
              id
              username
            }
          }
          hasNextPage
          nextCursor
        }
      }
    `;

    // Use a cursor just above the newest fixture ID
    // to exclude any existing older posts from page 1.
    const startingCursor = (BigInt(thirdId!) + 1n).toString();

    const firstPageResult = await executeGraphQL(listQuery, {
      cursor: startingCursor,
    });

    assert.equal(firstPageResult.errors, undefined);

    const firstPage = firstPageResult.data?.posts;

    assert.deepEqual(
      firstPage.items.map((post: { id: string }) => post.id),
      [thirdId, secondId],
    );

    assert.equal(firstPage.hasNextPage, true);
    assert.equal(firstPage.nextCursor, secondId);

    // Fetch the next page.
    const secondPageResult = await executeGraphQL(listQuery, {
      cursor: firstPage.nextCursor,
    });

    assert.equal(secondPageResult.errors, undefined);

    const secondPage = secondPageResult.data?.posts;

    assert.equal(secondPage.items[0]?.id, firstId);

    // Fetch a particular post and its author.
    const detail = await executeGraphQL(`
      query {
        post(id: "${firstId}") {
          id
          title
          content
          author {
            id
            username
          }
        }
      }
    `);

    assert.equal(detail.errors, undefined);
    assert.equal(detail.data?.post?.id, firstId);
    assert.equal(detail.data?.post?.title, "First");
    assert.equal(detail.data?.post?.author?.id, userId);

    // Valid but nonexistent ID.
    const missing = await executeGraphQL(`
      query {
        post(id: "9223372036854775807") {
          id
        }
      }
    `);

    assert.equal(missing.errors, undefined);
    assert.equal(missing.data?.post, null);

    // Invalid ID.
    const invalid = await executeGraphQL(`
      query {
        post(id: "abc") {
          id
        }
      }
    `);

    assert.equal(invalid.errors?.[0]?.extensions?.code, "INVALID_POST_ID");
  } finally {
    // Remove only this test's fixtures.
    if (postIds.length > 0) {
      await pool.query("DELETE FROM posts WHERE id = ANY($1::bigint[])", [
        postIds,
      ]);
    }

    if (userId) {
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }
  }
});

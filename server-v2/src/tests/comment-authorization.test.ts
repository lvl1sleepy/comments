import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { getNamedType, isCompositeType } from "graphql";
import { createYoga } from "graphql-yoga";
import { randomUUID } from "node:crypto";
import { signAccessToken } from "../auth/token.js";

// Safety: isolate real database-backed tests.
const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl || new URL(testUrl).pathname !== "/comments_test") {
  throw new Error("Expected TEST_DATABASE_URL for comments_test");
}

// Set the database before importing application modules.
// This assumes pool.ts reads DATABASE_URL.
process.env.DATABASE_URL = testUrl;

const { pool } = await import("../db/pool.js");
const { schema } = await import("../graphql/schema.js");
const { buildAuthContext } = await import("../graphql/context.js");
const { createAuthorLoader } = await import("../graphql/loaders.js");
const { createSecurityPlugins } =
  await import("../graphql/security-plugins.js");

before(async () => {
  // Verify the actual connected database, not just the URL.
  const result = await pool.query<{ name: string }>(
    "SELECT current_database() AS name",
  );

  assert.equal(
    result.rows[0]?.name,
    "comments_test",
    "Application pool must use the test database",
  );
});

after(async () => {
  await pool.end();
});

const yoga = createYoga({
  schema,
  plugins: createSecurityPlugins(),

  context: async ({ request }) => ({
    ...(await buildAuthContext(request.headers.get("authorization"))),
    loaders: {
      author: createAuthorLoader(),
    },
  }),
});

// Construct a valid mutation using the actual schema.
const deleteField = schema.getMutationType()?.getFields().deleteComment;

assert.ok(deleteField, "deleteComment mutation must exist");

const idArg = deleteField.args.find((arg) =>
  ["id", "commentId"].includes(arg.name),
);

assert.ok(idArg, "Expected an id or commentId argument");

const selection = isCompositeType(getNamedType(deleteField.type))
  ? "{ __typename }"
  : "";

const deleteMutation = `
  mutation {
    deleteComment(${idArg.name}: "999999") ${selection}
  }
`;

async function execute(authorization?: string) {
  const response = await yoga.fetch("http://localhost/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify({
      query: deleteMutation,
    }),
  });

  return (await response.json()) as {
    data?: Record<string, unknown>;
    errors?: Array<{
      message: string;
      extensions?: {
        code?: string;
      };
    }>;
  };
}

test("unauthenticated users cannot delete comments", async () => {
  const result = await execute();

  assert.ok(
    result.errors?.some(
      (error) => error.extensions?.code === "UNAUTHENTICATED",
    ),
    `Expected UNAUTHENTICATED: ${JSON.stringify(result)}`,
  );
});

test("invalid JWT cannot delete comments", async () => {
  const result = await execute("Bearer invalid.jwt.token");

  assert.ok(
    result.errors?.some(
      (error) => error.extensions?.code === "UNAUTHENTICATED",
    ),
    `Expected UNAUTHENTICATED: ${JSON.stringify(result)}`,
  );
});

test("only the owner can update or delete a comment", async () => {
  // Discover the mutation signatures from the real schema.
  const mutationType = schema.getMutationType();
  assert.ok(mutationType);

  const updateField = mutationType.getFields().updateComment;
  const deleteField = mutationType.getFields().deleteComment;

  assert.ok(updateField);
  assert.ok(deleteField);

  const updateIdArg = updateField.args.find((arg) =>
    ["id", "commentId"].includes(arg.name),
  );
  const contentArg = updateField.args.find((arg) => arg.name === "content");
  const deleteIdArg = deleteField.args.find((arg) =>
    ["id", "commentId"].includes(arg.name),
  );

  assert.ok(updateIdArg);
  assert.ok(contentArg);
  assert.ok(deleteIdArg);

  // Support scalar and object mutation return types.
  const updateSelection = isCompositeType(getNamedType(updateField.type))
    ? "{ __typename }"
    : "";

  const deleteSelection = isCompositeType(getNamedType(deleteField.type))
    ? "{ __typename }"
    : "";

  const updateMutation = `
    mutation UpdateComment(
      $commentId: ${String(updateIdArg.type)}
      $content: ${String(contentArg.type)}
    ) {
      updateComment(
        ${updateIdArg.name}: $commentId
        ${contentArg.name}: $content
      ) ${updateSelection}
    }
  `;

  const deleteMutation = `
    mutation DeleteComment(
      $commentId: ${String(deleteIdArg.type)}
    ) {
      deleteComment(
        ${deleteIdArg.name}: $commentId
      ) ${deleteSelection}
    }
  `;

  async function executeMutation(
    query: string,
    token: string,
    variables: Record<string, unknown>,
  ) {
    const response = await yoga.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    return (await response.json()) as {
      data?: Record<string, unknown>;
      errors?: Array<{
        message: string;
        extensions?: { code?: string };
      }>;
    };
  }

  // Unique test data prevents conflicts with other tests.
  const suffix = randomUUID().replace(/-/g, "");

  let ownerId: string | undefined;
  let otherUserId: string | undefined;
  let postId: string | undefined;
  let commentId: string | undefined;

  try {
    // 1. Create two users.
    const owner = await pool.query<{ id: string }>(
      `
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [
        `owner_${suffix.slice(0, 16)}`,
        `owner_${suffix}@example.test`,
        "unused-test-password-hash",
      ],
    );

    ownerId = owner.rows[0]!.id;

    const otherUser = await pool.query<{ id: string }>(
      `
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [
        `other_${suffix.slice(0, 16)}`,
        `other_${suffix}@example.test`,
        "unused-test-password-hash",
      ],
    );

    otherUserId = otherUser.rows[0]!.id;

    // 2. Create a post owned by User A.
    const post = await pool.query<{ id: string }>(
      `
        INSERT INTO posts (author_id, title, content)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [ownerId, "Authorization test", "Test post"],
    );

    postId = post.rows[0]!.id;

    // 3. Create User A's comment.
    const comment = await pool.query<{ id: string }>(
      `
        INSERT INTO comments (
          post_id, author_id, parent_id, content
        )
        VALUES ($1, $2, NULL, $3)
        RETURNING id
      `,
      [postId, ownerId, "Original content"],
    );

    commentId = comment.rows[0]!.id;

    const ownerToken = await signAccessToken(ownerId);
    const otherToken = await signAccessToken(otherUserId);

    // 4. User B attempts to update A's comment.
    const unauthorizedUpdate = await executeMutation(
      updateMutation,
      otherToken,
      {
        commentId,
        content: "Hacked content",
      },
    );

    assert.ok(
      unauthorizedUpdate.errors?.length,
      `Expected update rejection: ${JSON.stringify(unauthorizedUpdate)}`,
    );

    // Verify the unauthorized update changed nothing.
    const afterUnauthorizedUpdate = await pool.query<{
      content: string;
    }>("SELECT content FROM comments WHERE id = $1", [commentId]);

    assert.equal(afterUnauthorizedUpdate.rows[0]?.content, "Original content");

    // 5. User B attempts to delete A's comment.
    const unauthorizedDelete = await executeMutation(
      deleteMutation,
      otherToken,
      { commentId },
    );

    assert.ok(
      unauthorizedDelete.errors?.length,
      `Expected delete rejection: ${JSON.stringify(unauthorizedDelete)}`,
    );

    const afterUnauthorizedDelete = await pool.query<{
      deleted_at: Date | null;
    }>("SELECT deleted_at FROM comments WHERE id = $1", [commentId]);

    assert.equal(afterUnauthorizedDelete.rows[0]?.deleted_at, null);

    // 6. User A updates their own comment.
    const authorizedUpdate = await executeMutation(updateMutation, ownerToken, {
      commentId,
      content: "Updated by owner",
    });

    assert.equal(
      authorizedUpdate.errors,
      undefined,
      JSON.stringify(authorizedUpdate),
    );

    const updated = await pool.query<{ content: string }>(
      "SELECT content FROM comments WHERE id = $1",
      [commentId],
    );

    assert.equal(updated.rows[0]?.content, "Updated by owner");

    // 7. User A soft-deletes their comment.
    const authorizedDelete = await executeMutation(deleteMutation, ownerToken, {
      commentId,
    });

    assert.equal(
      authorizedDelete.errors,
      undefined,
      JSON.stringify(authorizedDelete),
    );

    const deleted = await pool.query<{
      deleted_at: Date | null;
    }>("SELECT deleted_at FROM comments WHERE id = $1", [commentId]);

    assert.equal(deleted.rows.length, 1);
    assert.ok(deleted.rows[0]?.deleted_at != null);

    // 8. Deleted comments cannot be edited.
    const updateDeleted = await executeMutation(updateMutation, ownerToken, {
      commentId,
      content: "Should not be saved",
    });

    assert.ok(
      updateDeleted.errors?.length,
      `Expected deleted-comment rejection: ${JSON.stringify(updateDeleted)}`,
    );
  } finally {
    // Delete only the fixtures created by this test.
    if (commentId) {
      await pool.query("DELETE FROM comments WHERE id = $1", [commentId]);
    }

    if (postId) {
      await pool.query("DELETE FROM posts WHERE id = $1", [postId]);
    }

    for (const id of [ownerId, otherUserId]) {
      if (id) {
        await pool.query("DELETE FROM users WHERE id = $1", [id]);
      }
    }
  }
});

test("comment integrity and soft-delete pagination", async (t) => {
  const suffix = randomUUID().replaceAll("-", "");

  let userId: string | undefined;
  let postA: string | undefined;
  let postB: string | undefined;

  async function insertComment(
    postId: string,
    parentId: string | null,
    content: string,
  ): Promise<string> {
    const result = await pool.query<{ id: string }>(
      `
        INSERT INTO comments (
          post_id, author_id, parent_id, content
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [postId, userId, parentId, content],
    );

    return result.rows[0]!.id;
  }

  type CommentItem = {
    id: string;
    parentId: string | null;
    content: string;
    isDeleted: boolean;
    hasReplies: boolean;
    author: { id: string; username: string } | null;
  };

  type CommentPage = {
    items: CommentItem[];
    hasNextPage: boolean;
    nextCursor: string | null;
  };

  async function runQuery(query: string) {
    const response = await yoga.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    return (await response.json()) as {
      data?: {
        topLevelComments?: CommentPage;
        commentReplies?: CommentPage;
      };
      errors?: Array<{ message: string }>;
    };
  }

  try {
    // Create a test user.
    const user = await pool.query<{ id: string }>(
      `
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [
        `integrity_${suffix.slice(0, 20)}`,
        `${suffix}@example.test`,
        "unused-test-hash",
      ],
    );

    userId = user.rows[0]!.id;

    // Create two separate posts.
    const posts = await pool.query<{ id: string }>(
      `
        INSERT INTO posts (author_id, title, content)
        VALUES
          ($1, 'Post A', 'First test post'),
          ($1, 'Post B', 'Second test post')
        RETURNING id
      `,
      [userId],
    );

    postA = posts.rows[0]!.id;
    postB = posts.rows[1]!.id;

    // Three root comments, ordered by their IDs.
    const root1 = await insertComment(postA, null, "Root 1");
    const root2 = await insertComment(postA, null, "Root 2");
    const root3 = await insertComment(postA, null, "Root 3");

    // A reply to the first root.
    const replyId = await insertComment(
      postA,
      root1,
      "Reply survives deletion",
    );

    await t.test("rejects cross-post replies", async () => {
      await assert.rejects(
        pool.query(
          `
            INSERT INTO comments (
              post_id, author_id, parent_id, content
            )
            VALUES ($1, $2, $3, $4)
          `,
          [postB, userId, root1, "Invalid cross-post reply"],
        ),
        (error: unknown) =>
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23503",
      );
    });

    // Soft-delete the parent, not its reply.
    await pool.query(
      `
        UPDATE comments
        SET deleted_at = NOW()
        WHERE id = $1
      `,
      [root1],
    );

    await t.test("redacts deleted parent content", async () => {
      const result = await runQuery(`
        query {
          topLevelComments(postId: "${postA}", limit: 2) {
            items {
              id
              content
              isDeleted
              hasReplies
              author {
                id
                username
              }
            }
            hasNextPage
            nextCursor
          }
        }
      `);

      assert.equal(result.errors, undefined, JSON.stringify(result));

      const page = result.data?.topLevelComments;
      assert.ok(page);

      const deletedParent = page.items.find((comment) => comment.id === root1);

      assert.ok(deletedParent);
      assert.equal(deletedParent.content, "[deleted]");
      assert.equal(deletedParent.isDeleted, true);
      assert.equal(deletedParent.hasReplies, true);
      assert.equal(deletedParent.author, null);
    });

    await t.test("preserves replies under deleted parents", async () => {
      const result = await runQuery(`
        query {
          commentReplies(parentId: "${root1}", limit: 10) {
            items {
              id
              parentId
              content
            }
            hasNextPage
          }
        }
      `);

      assert.equal(result.errors, undefined, JSON.stringify(result));

      const page = result.data?.commentReplies;
      assert.ok(page);

      assert.equal(page.items.length, 1);
      assert.equal(page.items[0]?.id, replyId);
      assert.equal(page.items[0]?.parentId, root1);
      assert.equal(page.items[0]?.content, "Reply survives deletion");
    });

    await t.test("pagination includes deleted roots", async () => {
      const first = await runQuery(`
        query {
          topLevelComments(postId: "${postA}", limit: 2) {
            items {
              id
              isDeleted
            }
            hasNextPage
            nextCursor
          }
        }
      `);

      assert.equal(first.errors, undefined, JSON.stringify(first));

      const firstPage = first.data?.topLevelComments;
      assert.ok(firstPage);

      assert.deepEqual(
        firstPage.items.map((comment) => comment.id),
        [root1, root2],
      );

      assert.equal(firstPage.hasNextPage, true);
      assert.equal(firstPage.nextCursor, root2);

      const second = await runQuery(`
        query {
          topLevelComments(
            postId: "${postA}"
            limit: 2
            afterId: "${firstPage.nextCursor}"
          ) {
            items {
              id
            }
            hasNextPage
            nextCursor
          }
        }
      `);

      assert.equal(second.errors, undefined, JSON.stringify(second));

      const secondPage = second.data?.topLevelComments;
      assert.ok(secondPage);

      assert.deepEqual(
        secondPage.items.map((comment) => comment.id),
        [root3],
      );

      assert.equal(secondPage.hasNextPage, false);
      assert.equal(secondPage.nextCursor, null);
    });
  } finally {
    // Delete only the fixtures belonging to these test posts.
    const postIds = [postA, postB].filter(
      (id): id is string => id !== undefined,
    );

    if (postIds.length > 0) {
      // Delete replies before parents.
      await pool.query(
        `
          DELETE FROM comments
          WHERE post_id = ANY($1::bigint[])
            AND parent_id IS NOT NULL
        `,
        [postIds],
      );

      await pool.query(
        `
          DELETE FROM comments
          WHERE post_id = ANY($1::bigint[])
        `,
        [postIds],
      );

      await pool.query("DELETE FROM posts WHERE id = ANY($1::bigint[])", [
        postIds,
      ]);
    }

    if (userId) {
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }
  }
});

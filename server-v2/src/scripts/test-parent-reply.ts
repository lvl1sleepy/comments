import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { pool } from "../db/pool.js";
import { createParentWithReply } from "../services/create-parent-with-reply.js";

interface CommentRow {
  id: string;
  parent_id: string | null;
  content: string;
}

async function main() {
  const postId = process.env.TX_TEST_POST_ID;
  const authorId = process.env.TX_TEST_AUTHOR_ID;

  if (!postId || !authorId) {
    throw new Error("Set TX_TEST_POST_ID and TX_TEST_AUTHOR_ID");
  }

  const suffix = randomUUID();
  const parentContent = `Transaction parent ${suffix}`;
  const replyContent = `Transaction reply ${suffix}`;

  const expectRollback = process.env.TX_TEST_EXPECT_ROLLBACK === "1";

  let parentId: string | undefined;
  let failure: unknown;

  try {
    parentId = await createParentWithReply(
      postId,
      authorId,
      parentContent,
      replyContent,
    );
  } catch (error) {
    failure = error;
  }

  // Check persisted rows using a separate query after
  // createParentWithReply() has completed or failed.
  const result = await pool.query<CommentRow>(
    `
      SELECT id, parent_id, content
      FROM comments
      WHERE post_id = $1
        AND author_id = $2
        AND content IN ($3, $4)
    `,
    [postId, authorId, parentContent, replyContent],
  );

  if (expectRollback) {
    assert.ok(failure instanceof Error);
    assert.equal(failure.message, "Simulated failure");
    assert.equal(result.rows.length, 0);

    console.log("PASS: Transaction rolled back.");
    console.log("Neither comment was saved.");
    return;
  }

  if (failure) {
    throw failure;
  }

  assert.ok(parentId);
  assert.equal(result.rows.length, 2);

  const parent = result.rows.find((row) => row.content === parentContent);

  const reply = result.rows.find((row) => row.content === replyContent);

  assert.ok(parent);
  assert.ok(reply);

  assert.equal(parent.id, parentId);
  assert.equal(parent.parent_id, null);
  assert.equal(reply.parent_id, parent.id);

  console.log("PASS: Transaction committed.");
  console.log("Parent ID:", parent.id);
  console.log("Reply ID:", reply.id);
  console.log("Reply parent_id:", reply.parent_id);
}

try {
  await main();
} finally {
  await pool.end();
}

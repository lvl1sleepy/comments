import { withTransaction } from "../db/transaction.js";

export async function createParentWithReply(
  postId: string,
  authorId: string,
  parentContent: string,
  replyContent: string,
): Promise<string> {
  return withTransaction(async (client) => {
    // 1. Insert parent comment
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO comments (
          post_id,
          author_id,
          parent_id,
          content
        )
        VALUES ($1, $2, NULL, $3)
        RETURNING id
      `,
      [postId, authorId, parentContent],
    );

    const parentId = result.rows[0]!.id;
    // throw new Error("Simulated failure");

    // 2. Insert reply
    await client.query(
      `
        INSERT INTO comments (
          post_id,
          author_id,
          parent_id,
          content
        )
        VALUES ($1, $2, $3, $4)
      `,
      [postId, authorId, parentId, replyContent],
    );

    // 3. Return parent ID after successful transaction
    return parentId;
  });
}

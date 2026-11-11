import { pool } from "../db/pool.js";
import { timedQuery } from "../db/timed-query.js";

export interface CommentRow {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  is_deleted: boolean;
  has_replies: boolean;
}

export interface CommentTreeRow extends CommentRow {
  depth: number;
}

export interface CreateCommentInput {
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
}

export interface UpdateCommentInput {
  commentId: string;
  authorId: string;
  content: string;
}

export interface DeleteCommentInput {
  commentId: string;
  authorId: string;
}

export interface GetTopLevelCommentsInput {
  postId: string;
  afterId: string | null;
  limit: number;
}

export interface GetCommentRepliesInput {
  parentId: string;
  afterId: string | null;
  limit: number;
}

export async function getCommentsByPostId(
  postId: string,
): Promise<CommentRow[]> {
  const result = await pool.query<CommentRow>(
    `SELECT id, post_id, parent_id, author_id,
      CASE
        WHEN deleted_at IS NOT NULL THEN '[deleted]'
        ELSE content
      END AS content,
      deleted_at IS NOT NULL AS is_deleted,
      EXISTS (
        SELECT 1
        FROM comments AS child
        WHERE child.parent_id = c.id
      ) AS has_replies
     FROM comments
     WHERE post_id = $1
     ORDER BY id`,
    [postId],
  );
  return result.rows;
}

export async function getCommentSubtree(
  commentId: string,
): Promise<CommentTreeRow[]> {
  const result = await pool.query<CommentTreeRow>(
    `WITH RECURSIVE comment_tree AS (
      SELECT
        id,
        post_id,
        parent_id,
        author_id,
        content,
        deleted_at,
        0 AS depth
      FROM comments
      WHERE id = $1

      UNION ALL

      SELECT
        child.id,
        child.post_id,
        child.parent_id,
        child.author_id,
        child.content,
        child.deleted_at,
        parent.depth + 1
      FROM comments AS child
      JOIN comment_tree AS parent
        ON child.parent_id = parent.id
      WHERE child.post_id = parent.post_id
    )

    CYCLE id SET is_cycle USING traversal_path

    SELECT
      ct.id,
      ct.post_id,
      ct.parent_id,
      ct.author_id,
      CASE
        WHEN ct.deleted_at IS NOT NULL THEN '[deleted]'
        ELSE ct.content
      END AS content,
      ct.deleted_at IS NOT NULL AS is_deleted,
      ct.depth,
      EXISTS (
        SELECT 1
        FROM comments AS child
        WHERE child.parent_id = ct.id
      ) AS has_replies
    FROM comment_tree AS ct
    WHERE NOT ct.is_cycle
    ORDER BY ct.traversal_path`,
    [commentId],
  );

  return result.rows;
}

export async function createComment(
  input: CreateCommentInput,
): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO comments (post_id, author_id, parent_id, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id`,
    [input.postId, input.authorId, input.parentId, input.content],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("Failed to create comment");
  }

  return row.id;
}

export async function updateComment(
  input: UpdateCommentInput,
): Promise<string | null> {
  const result = await pool.query<{ id: string }>(
    `UPDATE comments
      SET
        content = $3,
        updated_at = NOW()
      WHERE id = $1
        AND author_id = $2
        AND deleted_at IS NULL
      RETURNING id`,
    [input.commentId, input.authorId, input.content],
  );

  return result.rows[0]?.id ?? null;
}

export async function deleteComment(
  input: DeleteCommentInput,
): Promise<string | null> {
  const result = await pool.query<{ id: string }>(
    `UPDATE comments
      SET
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
        AND author_id = $2
        AND deleted_at IS NULL
      RETURNING id`,
    [input.commentId, input.authorId],
  );

  return result.rows[0]?.id ?? null;
}

export async function getTopLevelComments(
  input: GetTopLevelCommentsInput,
): Promise<CommentTreeRow[]> {
  const result = await timedQuery<CommentTreeRow>(
    "comments.getTopLevelComments",
    `SELECT
       c.id,
       c.post_id,
       c.parent_id,
       c.author_id,
       CASE
         WHEN c.deleted_at IS NOT NULL THEN '[deleted]'
         ELSE c.content
       END AS content,
       c.deleted_at IS NOT NULL AS is_deleted,
       EXISTS (
         SELECT 1
         FROM comments AS child
         WHERE child.parent_id = c.id
       ) AS has_replies,
       0::integer AS depth
     FROM comments AS c
     WHERE c.post_id = $1
       AND c.parent_id IS NULL
       AND ($2::bigint IS NULL OR c.id > $2::bigint)
     ORDER BY c.id ASC
     LIMIT $3`,
    [input.postId, input.afterId, input.limit],
  );

  return result.rows;
}

export async function getCommentReplies(
  input: GetCommentRepliesInput,
): Promise<CommentTreeRow[]> {
  const result = await pool.query<CommentTreeRow>(
    `SELECT
       c.id,
       c.post_id,
       c.parent_id,
       c.author_id,
       CASE
         WHEN c.deleted_at IS NOT NULL THEN '[deleted]'
         ELSE c.content
       END AS content,
       c.deleted_at IS NOT NULL AS is_deleted,
       EXISTS (
         SELECT 1
         FROM comments AS child
         WHERE child.parent_id = c.id
       ) AS has_replies,
       1::integer AS depth
     FROM comments AS c
     WHERE c.parent_id = $1
       AND ($2::bigint IS NULL OR c.id > $2::bigint)
     ORDER BY c.id ASC
     LIMIT $3`,
    [input.parentId, input.afterId, input.limit],
  );

  return result.rows;
}

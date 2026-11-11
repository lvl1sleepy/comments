import { pool } from "../db/pool.js";

export interface PostRow {
  id: string;
  author_id: string;
  title: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface GetPostsInput {
  afterId: string | null;
  limit: number;
}

export async function getPostById(postId: string): Promise<PostRow | null> {
  const result = await pool.query<PostRow>(
    `
      SELECT id, author_id, title, content,
             created_at, updated_at
      FROM posts
      WHERE id = $1
    `,
    [postId],
  );

  return result.rows[0] ?? null;
}

export async function getPosts(input: GetPostsInput): Promise<PostRow[]> {
  const result = await pool.query<PostRow>(
    `
    SELECT
      id,
      author_id,
      title,
      content,
      created_at,
      updated_at
    FROM posts
    WHERE ($1::bigint IS NULL OR id < $1::bigint)
    ORDER BY id DESC
    LIMIT $2;
    `,
    [input.afterId, input.limit],
  );

  return result.rows ?? null;
}

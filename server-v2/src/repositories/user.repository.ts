import { hashPassword } from "../auth/password.js";
import { pool } from "../db/pool.js";
import { AppError } from "../errors/app-error.js";

export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
}

export interface UserRow {
  id: string;
  username: string;
  email: string;
}

export interface UserAuthRow extends UserRow {
  password_hash: string;
}

export interface CommentAuthorRow {
  id: string;
  username: string;
}

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (username, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username, email`,
    [input.username, input.email, input.passwordHash],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Failed to create user");
  }
  return row;
}

export async function findUserByEmail(
  email: string,
): Promise<UserAuthRow | null> {
  const result = await pool.query<UserAuthRow>(
    `SELECT id, username, email, password_hash FROM users
      WHERE email = $1`,
    [email],
  );

  return result.rows[0] ?? null;
}

export async function findUsersByIds(
  userIds: readonly string[],
): Promise<CommentAuthorRow[]> {
  if (userIds.length === 0) {
    return [];
  }

  const result = await pool.query<CommentAuthorRow>(
    `SELECT id, username
     FROM users
     WHERE id = ANY($1::bigint[])`,
    [userIds],
  );

  return result.rows;
}

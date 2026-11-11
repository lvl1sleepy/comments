import {
  getCommentReplies,
  getTopLevelComments,
  createComment as insertComment,
  type CommentTreeRow,
  type GetCommentRepliesInput,
} from "../repositories/comment.repository.js";

import {
  updateComment,
  type CreateCommentInput,
  type UpdateCommentInput,
  deleteComment,
  type DeleteCommentInput,
} from "../repositories/comment.repository.js";

import { AppError } from "../errors/app-error.js";
import { isPostgresError } from "../db/postgres-error.js";

export interface GetTopLevelCommentsServiceInput {
  postId: string;
  afterId: string | null;
  limit: number;
}

export interface CommentPage {
  items: CommentTreeRow[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface PaginationInput {
  afterId: string | null;
  limit: number;
}

function validateCommentContent(content: string): string {
  const trimmedContent = content.trim();

  if (trimmedContent.length === 0) {
    throw new AppError("INVALID_COMMENT_CONTENT", "Comment cannot be empty");
  }

  if (trimmedContent.length > 2000) {
    throw new AppError(
      "COMMENT_TOO_LONG",
      "Comment cannot exceed 2000 characters",
    );
  }

  return trimmedContent;
}

export function validatePagination(input: PaginationInput): void {
  const limit = input.limit;

  const isLimitValid = Number.isInteger(limit) && limit >= 1 && limit <= 50;

  if (!isLimitValid) {
    throw new AppError(
      "INVALID_PAGE_SIZE",
      "Page size must be between 1 and 50",
    );
  }

  const afterId = input.afterId;

  if (afterId !== null) {
    if (
      !/^[1-9]\d*$/.test(afterId) ||
      afterId.length > 19 ||
      BigInt(afterId) > 9223372036854775807n
    ) {
      throw new AppError("INVALID_CURSOR", "Invalid pagination cursor");
    }
  }
}

export function buildCommentPage(
  rows: CommentTreeRow[],
  limit: number,
): CommentPage {
  const hasNextPage = rows.length > limit;
  const items = rows.slice(0, limit);

  const nextCursor = hasNextPage ? (items.at(-1)?.id ?? null) : null;

  return {
    items,
    nextCursor,
    hasNextPage,
  };
}

export async function createCommentService(
  input: CreateCommentInput,
): Promise<string> {
  const content = validateCommentContent(input.content);

  try {
    return await insertComment({
      ...input,
      content,
    });
  } catch (error: unknown) {
    if (isPostgresError(error) && error.code === "23503") {
      if (
        error.constraint === "fk_comments_parent_same_post" ||
        error.constraint === "fk_comment_parent"
      ) {
        throw new AppError(
          "INVALID_PARENT_COMMENT",
          "Parent comment is invalid or belongs to another post",
        );
      }
      if (error.constraint === "fk_comments_post") {
        throw new AppError("POST_NOT_FOUND", "Post is invalid");
      }
      if (error.constraint === "fk_comment_author") {
        throw new AppError("INVALID_AUTHOR", "Author is invalid");
      }
    }
    throw error;
  }
}

export async function updateCommentService(
  input: UpdateCommentInput,
): Promise<string> {
  const content = validateCommentContent(input.content);

  const updatedCommentId = await updateComment({
    ...input,
    content,
  });

  if (updatedCommentId === null) {
    throw new AppError("COMMENT_NOT_FOUND", "Comment not found");
  }

  return updatedCommentId;
}

export async function deleteCommentService(
  input: DeleteCommentInput,
): Promise<string> {
  const deletedCommentId = await deleteComment(input);

  if (deletedCommentId === null) {
    throw new AppError("COMMENT_NOT_FOUND", "Comment not found");
  }

  return deletedCommentId;
}

export async function getTopLevelCommentsService(
  input: GetTopLevelCommentsServiceInput,
): Promise<CommentPage> {
  validatePagination(input);

  const rows = await getTopLevelComments({
    ...input,
    limit: input.limit + 1,
  });

  return buildCommentPage(rows, input.limit);
}

export async function getCommentRepliesService(
  input: GetCommentRepliesInput,
): Promise<CommentPage> {
  validatePagination(input);

  const rows = await getCommentReplies({
    ...input,
    limit: input.limit + 1,
  });

  return buildCommentPage(rows, input.limit);
}

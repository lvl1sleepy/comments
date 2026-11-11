import { AppError } from "../errors/app-error.js";
import {
  getPostById,
  getPosts,
  type PostRow,
} from "../repositories/post.repository.js";
import { isValidId } from "../utils/validate-id.js";

export interface PostPage {
  items: PostRow[];
  hasNextPage: boolean;
  nextCursor: string | null;
}

interface GetPostsServiceInput {
  limit: number;
  afterId: string | null;
}

export async function getPostsService(
  input: GetPostsServiceInput,
): Promise<PostPage> {
  const { limit, afterId } = input;

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new AppError(
      "INVALID_PAGE_SIZE",
      "Page size must be an integer between 1 and 50",
    );
  }

  if (afterId !== null && !isValidId(afterId)) {
    throw new AppError("INVALID_CURSOR", "Invalid pagination cursor");
  }

  const rows = await getPosts({
    afterId,
    limit: limit + 1,
  });

  const hasNextPage = rows.length > limit;
  const items = rows.slice(0, limit);

  return {
    items,
    hasNextPage,
    nextCursor: hasNextPage ? (items.at(-1)?.id ?? null) : null,
  };
}

export async function getPostService(postId: string): Promise<PostRow | null> {
  if (!isValidId(postId)) {
    throw new AppError("INVALID_POST_ID", "Invalid post ID");
  }

  return getPostById(postId);
}

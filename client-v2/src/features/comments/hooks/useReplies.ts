import { useInfiniteQuery } from "@tanstack/react-query";
import { getCommentReplies } from "../api/comments.api";

export function useReplies(parentId: string, enabled: boolean, limit = 5) {
  return useInfiniteQuery({
    queryKey: ["comments", "replies", parentId, limit],

    initialPageParam: null as string | null,

    queryFn: ({ pageParam }) => getCommentReplies(parentId, limit, pageParam),

    getNextPageParam: (lastPage) =>
      lastPage.commentReplies.hasNextPage
        ? lastPage.commentReplies.nextCursor
        : null,

    enabled: enabled && Boolean(parentId),
  });
}

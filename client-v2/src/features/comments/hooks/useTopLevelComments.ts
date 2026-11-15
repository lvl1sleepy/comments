import { useInfiniteQuery } from "@tanstack/react-query";
import { getTopLevelComments } from "../api/comments.api";

export function useTopLevelComments(postId: string, limit = 5) {
  return useInfiniteQuery({
    queryKey: ["comments", "root", postId, limit],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getTopLevelComments(postId, limit, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.topLevelComments.hasNextPage
        ? lastPage.topLevelComments.nextCursor
        : null,
    enabled: Boolean(postId),
  });
}

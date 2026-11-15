import { useInfiniteQuery } from "@tanstack/react-query";
import { getPosts } from "../api/posts.api";

export function useInfinitePosts(limit: number) {
  return useInfiniteQuery({
    queryKey: ["posts", "infinite", limit],

    initialPageParam: null as string | null,

    queryFn: ({ pageParam }) => getPosts(limit, pageParam),

    getNextPageParam: (lastPage) => {
      if (!lastPage.posts.hasNextPage) {
        return null;
      }

      return lastPage.posts.nextCursor;
    },
  });
}

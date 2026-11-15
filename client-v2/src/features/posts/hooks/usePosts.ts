import { useQuery } from "@tanstack/react-query";
import { getPosts } from "../api/posts.api";

export function usePosts(limit: number) {
  return useQuery({
    queryKey: ["posts", limit],
    queryFn: () => getPosts(limit),
  });
}

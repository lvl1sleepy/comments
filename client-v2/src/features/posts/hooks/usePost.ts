import { useQuery } from "@tanstack/react-query";
import { getPost } from "../api/posts.api";

export function usePost(postId: string) {
  return useQuery({
    queryKey: ["posts", "detail", postId],
    queryFn: () => getPost(postId),
    enabled: Boolean(postId),
  });
}

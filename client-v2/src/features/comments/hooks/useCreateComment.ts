import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createComment } from "../api/comments.api";

export function useCreateComment(
  postId: string,
  parentId: string | null = null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      createComment({
        postId,
        parentId,
        content,
      }),

    onSuccess: async () => {
      const queryKey = parentId
        ? ["comments", "replies", parentId]
        : ["comments", "root", postId];

      await queryClient.invalidateQueries({
        queryKey,
      });
    },
  });
}

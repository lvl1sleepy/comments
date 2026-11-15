import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateComment, deleteComment } from "../api/comments.api";

import type { Comment } from "../types";

export function useCommentActions(comment: Comment) {
  const queryClient = useQueryClient();

  const queryKey = comment.parentId
    ? ["comments", "replies", comment.parentId]
    : ["comments", "root", comment.postId];

  const refreshComments = () =>
    queryClient.invalidateQueries({
      queryKey,
    });

  const updateMutation = useMutation({
    mutationFn: (content: string) => updateComment(comment.id, content),

    onSuccess: refreshComments,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteComment(comment.id),

    onSuccess: refreshComments,
  });

  return {
    updateMutation,
    deleteMutation,
  };
}

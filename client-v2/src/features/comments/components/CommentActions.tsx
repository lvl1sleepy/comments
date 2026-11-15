import { useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../../auth/auth-context";
import { useCommentActions } from "../hooks/useCommentActions";
import type { Comment } from "../types";

export default function CommentActions({ comment }: { comment: Comment }) {
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { updateMutation, deleteMutation } = useCommentActions(comment);

  // Hooks must always be called before conditional returns.
  if (!user || comment.isDeleted || comment.author?.id !== user.id) {
    return null;
  }

  function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || content.length > 2000) {
      return;
    }

    updateMutation.mutate(content, {
      onSuccess: () => setEditing(false),
    });
  }

  return (
    <div>
      {editing ? (
        <form onSubmit={handleEdit}>
          <textarea
            aria-label="Edit comment"
            value={draft}
            maxLength={2000}
            onChange={(event) => setDraft(event.target.value)}
          />

          <button
            type="submit"
            disabled={updateMutation.isPending || !draft.trim()}
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            disabled={updateMutation.isPending}
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(comment.content);
            setEditing(true);
          }}
        >
          Edit
        </button>
      )}

      {!confirmDelete ? (
        <button type="button" onClick={() => setConfirmDelete(true)}>
          Delete
        </button>
      ) : (
        <div>
          <p>Delete this comment?</p>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? "Deleting..." : "Confirm delete"}
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {updateMutation.isError && (
        <p role="alert">{updateMutation.error.message}</p>
      )}

      {deleteMutation.isError && (
        <p role="alert">{deleteMutation.error.message}</p>
      )}
    </div>
  );
}

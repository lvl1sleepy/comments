import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../auth/auth-context";
import AuthPanel from "../../auth/components/AuthPanel";

import { useCreateComment } from "../hooks/useCreateComment";

interface Props {
  postId: string;
}

export default function CommentComposer({ postId }: Props) {
  const [content, setContent] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const { user, signOut } = useAuth();

  const mutation = useCreateComment(postId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || trimmedContent.length > 2000) {
      return;
    }

    setCreatedId(null);

    mutation.mutate(trimmedContent, {
      onSuccess: (data) => {
        setContent("");
        setCreatedId(data.createComment);
      },
    });
  }

  if (!user) {
    return <AuthPanel />;
  }

  return (
    <section>
      <h3>Write a comment</h3>

      <form onSubmit={handleSubmit}>
        <label htmlFor="comment-content">Your comment</label>

        <textarea
          id="comment-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={2000}
          rows={4}
          required
        />

        <button type="submit" disabled={mutation.isPending || !content.trim()}>
          {mutation.isPending ? "Posting..." : "Post Comment"}
        </button>
      </form>

      {mutation.isError && (
        <p role="alert">Failed to create comment: {mutation.error.message}</p>
      )}

      {createdId && (
        <p role="status">Comment #{createdId} created successfully.</p>
      )}

      <button type="button" onClick={signOut}>
        Log out
      </button>
    </section>
  );
}

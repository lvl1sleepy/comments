import { useState } from "react";
import type { FormEvent } from "react";

import { useCreateComment } from "../hooks/useCreateComment";

interface Props {
  postId: string;
  parentId: string;
  onCreated: (commentId: string) => void;
  onCancel: () => void;
}

export default function ReplyForm({
  postId,
  parentId,
  onCreated,
  onCancel,
}: Props) {
  const [content, setContent] = useState("");

  const mutation = useCreateComment(postId, parentId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || trimmedContent.length > 2000) {
      return;
    }

    mutation.mutate(trimmedContent, {
      onSuccess: (data) => {
        setContent("");
        onCreated(data.createComment);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={`reply-${parentId}`}>Write a reply</label>

      <textarea
        id={`reply-${parentId}`}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        maxLength={2000}
        required
      />

      <div>
        <button type="submit" disabled={mutation.isPending || !content.trim()}>
          {mutation.isPending ? "Posting..." : "Post Reply"}
        </button>

        <button type="button" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </button>
      </div>

      {mutation.isError && (
        <p role="alert">Failed to create reply: {mutation.error.message}</p>
      )}
    </form>
  );
}

import { memo, useState } from "react";
import { useAuth } from "../../auth/auth-context";
import { useReplies } from "../hooks/useReplies";
import type { Comment } from "../types";
import ReplyForm from "./ReplyForm";
import CommentActions from "./CommentActions";

interface Props {
  comment: Comment;
  postId: string;
}

function CommentItem({ comment, postId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [replyFormOpen, setReplyFormOpen] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [createdReplyId, setCreatedReplyId] = useState<string | null>(null);
  const { user } = useAuth();

  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useReplies(comment.id, expanded);

  const replies =
    data?.pages.flatMap((page) => page.commentReplies.items) ?? [];

  function handleReplyClick() {
    if (replyFormOpen) {
      setReplyFormOpen(false);
      return;
    }

    if (!user) {
      setLoginRequired(true);
      return;
    }

    setLoginRequired(false);
    setReplyFormOpen(true);
  }

  function handleReplyCreated(commentId: string) {
    setCreatedReplyId(commentId);
    setReplyFormOpen(false);
    setExpanded(true);
  }

  return (
    <li>
      <p>{comment.content}</p>
      <CommentActions comment={comment} />

      <div>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Hide replies" : "Show replies"}
        </button>

        <button type="button" onClick={handleReplyClick}>
          {replyFormOpen ? "Cancel reply" : "Reply"}
        </button>
      </div>

      {loginRequired && !user && (
        <p role="status">Log in using the form above to reply.</p>
      )}

      {replyFormOpen && (
        <ReplyForm
          postId={postId}
          parentId={comment.id}
          onCreated={handleReplyCreated}
          onCancel={() => setReplyFormOpen(false)}
        />
      )}

      {createdReplyId && (
        <p role="status">Reply #{createdReplyId} created successfully.</p>
      )}

      {expanded && (
        <div>
          {isPending && <p>Loading replies...</p>}

          {isError && (
            <p role="alert">Failed to load replies: {error.message}</p>
          )}

          {data && (
            <>
              {replies.length === 0 && <p>No replies yet.</p>}

              {replies.length > 0 && (
                <ul>
                  {replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                    />
                  ))}
                </ul>
              )}

              {hasNextPage && (
                <button
                  type="button"
                  disabled={isFetching}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? "Loading..." : "Load more replies"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

export default memo(CommentItem);

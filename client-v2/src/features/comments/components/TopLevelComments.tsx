import { useTopLevelComments } from "../hooks/useTopLevelComments";
import CommentItem from "./CommentItem";

interface Props {
  postId: string;
}

export default function TopLevelComments({ postId }: Props) {
  const {
    data,
    isPending,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isFetchingNextPage,
  } = useTopLevelComments(postId);

  if (isPending) return <p>Loading comments...</p>;

  if (!data) {
    return <p>Failed to load comments: {error?.message}</p>;
  }

  const comments = data.pages.flatMap((page) => page.topLevelComments.items);

  return (
    <section>
      <h2>Comments</h2>

      {comments.length === 0 && <p>No comments yet.</p>}

      <ul>
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} postId={postId} />
        ))}
      </ul>

      {isError && <p role="alert">{error?.message}</p>}

      {hasNextPage && (
        <button
          type="button"
          onClick={() => void fetchNextPage()}
          disabled={isFetching}
        >
          {isFetchingNextPage ? "Loading..." : "Load more comments"}
        </button>
      )}
    </section>
  );
}

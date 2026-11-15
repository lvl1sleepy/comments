import { Link, useParams } from "react-router";
import { usePost } from "../features/posts/hooks/usePost";
import TopLevelComments from "../features/comments/components/TopLevelComments";
import CommentComposer from "../features/comments/components/CommentComposer";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import styles from "./PostDetailsPage.module.css";

export default function PostDetailsPage() {
  const { postId } = useParams<{ postId: string }>();

  const { data, isPending, isError, error, refetch } = usePost(postId ?? "");

  if (!postId) {
    return <p>Invalid post ID.</p>;
  }

  if (isPending) {
    return <LoadingState message="Loading post..." />;
  }

  if (isError) {
    return (
      <ErrorState message={error.message} onRetry={() => void refetch()} />
    );
  }

  const post = data.post;

  if (!post) {
    return (
      <main>
        <h1>Post not found</h1>
        <Link to="/">Back to posts</Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Link to="/" className={styles.backLink}>
        ← Back to posts
      </Link>

      <article className={styles.post}>
        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.content}>{post.content}</p>
      </article>

      <section className={styles.comments}>
        <CommentComposer postId={post.id} />
        <TopLevelComments postId={post.id} />
      </section>
    </main>
  );
}

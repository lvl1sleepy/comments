import { Link } from "react-router";
import { useInfinitePosts } from "../features/posts/hooks/useInfinitePosts";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import styles from "./PostsPage.module.css";

export default function PostsPage() {
  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = useInfinitePosts(5);

  if (isPending) {
    return <LoadingState message="Loading posts..." />;
  }

  if (!data) {
    return (
      <ErrorState
        message={error?.message ?? "Unable to load posts"}
        onRetry={() => void refetch()}
      />
    );
  }

  const posts = data.pages.flatMap((page) => page.posts.items);

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Recent Posts</h1>

      {posts.length === 0 ? (
        <p>No posts available.</p>
      ) : (
        <div className={styles.feed}>
          {posts.map((post) => (
            <article key={post.id} className={styles.card}>
              <h2 className={styles.title}>
                <Link to={`/posts/${post.id}`}>{post.title}</Link>
              </h2>

              <p className={styles.content}>{post.content}</p>
            </article>
          ))}
        </div>
      )}

      {isFetchNextPageError && (
        <p role="alert">Failed to load more posts: {error?.message}</p>
      )}

      {hasNextPage && (
        <button
          type="button"
          className={styles.loadMore}
          onClick={() => void fetchNextPage()}
          disabled={isFetching}
        >
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}

      {isError && !isFetchNextPageError && (
        <p role="alert">Could not refresh posts: {error?.message}</p>
      )}
    </main>
  );
}

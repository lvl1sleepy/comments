-- Up Migration

CREATE INDEX idx_posts_author_created_at
ON public.posts (author_id, created_at DESC, id DESC);

-- Down Migration

DROP INDEX public.idx_posts_author_created_at;

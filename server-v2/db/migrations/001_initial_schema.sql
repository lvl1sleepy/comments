CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_posts_author
      FOREIGN KEY (author_id)
      REFERENCES users(id)
      ON DELETE RESTRICT
);

CREATE TABLE comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id BIGINT NOT NULL,
  author_id BIGINT NOT NULL,
  parent_id BIGINT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT fk_comments_post
      FOREIGN KEY (post_id)
      REFERENCES posts(id)
      ON DELETE RESTRICT,

  CONSTRAINT fk_comment_author
      FOREIGN KEY (author_id)
      REFERENCES users(id)
      ON DELETE RESTRICT,

  CONSTRAINT fk_comment_parent
      FOREIGN KEY (parent_id)
      REFERENCES comments(id)
      ON DELETE RESTRICT,

  CONSTRAINT chk_comments_not_self_parent    
    CHECK (parent_id IS NULL OR parent_id <> id)
);
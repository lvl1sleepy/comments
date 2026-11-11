ALTER TABLE comments
ADD CONSTRAINT uq_comments_post_id_id
UNIQUE (post_id, id);


ALTER TABLE comments
ADD CONSTRAINT fk_comments_parent_same_post
FOREIGN KEY (post_id, parent_id)
REFERENCES comments (post_id, id)
ON DELETE RESTRICT;

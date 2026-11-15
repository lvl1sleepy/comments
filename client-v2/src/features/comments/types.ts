export interface Comment {
  id: string;
  content: string;
}

export interface CommentPage {
  items: Comment[];
  hasNextPage: boolean;
  nextCursor: string | null;
}

export interface TopLevelCommentsResponse {
  topLevelComments: CommentPage;
}

export interface CommentRepliesResponse {
  commentReplies: CommentPage;
}

export interface CreateCommentInput {
  postId: string;
  parentId: string | null;
  content: string;
}

export interface CreateCommentResponse {
  createComment: string;
}

export interface CommentAuthor {
  id: string;
  username: string;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  isDeleted: boolean;
  author: CommentAuthor | null;
}

export interface UpdateCommentResponse {
  updateComment: string;
}

export interface DeleteCommentResponse {
  deleteComment: string;
}

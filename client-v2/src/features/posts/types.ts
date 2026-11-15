export interface Post {
  id: string;
  title: string;
  content: string;
}

export interface PostPage {
  items: Post[];
  hasNextPage: boolean;
  nextCursor: string | null;
}

export interface PostsResponse {
  posts: PostPage;
}

export interface PostDetailsResponse {
  post: Post | null;
}

import { graphqlRequest } from "../../../api/graphql";
import type { PostDetailsResponse, PostsResponse } from "../types";

const GET_POSTS = `
  query GetPosts($limit: Int!, $afterId: ID) {
    posts(limit: $limit, afterId: $afterId) {
      items {
        id
        title
        content
      }
      hasNextPage
      nextCursor
    }
  }
`;

const GET_POST = `
  query GetPost($id: ID!) {
    post(id: $id) {
      id
      title
      content
    }
  }
`;

export async function getPosts(
  limit: number,
  afterId: string | null = null,
): Promise<PostsResponse> {
  return graphqlRequest<PostsResponse>(GET_POSTS, {
    limit,
    afterId,
  });
}
// Add this alongside GET_POSTS.

export async function getPost(id: string): Promise<PostDetailsResponse> {
  return graphqlRequest<PostDetailsResponse>(GET_POST, { id });
}

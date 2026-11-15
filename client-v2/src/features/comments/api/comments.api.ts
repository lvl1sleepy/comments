import { graphqlRequest } from "../../../api/graphql";
import type {
  CommentRepliesResponse,
  CreateCommentInput,
  CreateCommentResponse,
  DeleteCommentResponse,
  TopLevelCommentsResponse,
  UpdateCommentResponse,
} from "../types";

const GET_TOP_LEVEL_COMMENTS = `
  query GetTopLevelComments(
    $postId: ID!
    $limit: Int!
    $afterId: ID
  ) {
    topLevelComments(
      postId: $postId
      limit: $limit
      afterId: $afterId
    ) {
      items {
        id
        postId
        parentId
        content
        isDeleted
        author {
          id
          username
        }
      }
    }
  }
`;

const GET_COMMENT_REPLIES = `
  query GetCommentReplies(
    $parentId: ID!
    $limit: Int!
    $afterId: ID
  ) {
    commentReplies(
      parentId: $parentId
      limit: $limit
      afterId: $afterId
    ) {
      items {
        id
        postId
        parentId
        content
        isDeleted
        author {
          id
          username
        }
      }
    }
  }
`;

const CREATE_COMMENT = `
  mutation CreateComment(
    $postId: ID!
    $parentId: ID
    $content: String!
  ) {
    createComment(
      postId: $postId
      parentId: $parentId
      content: $content
    )
  }
`;

const UPDATE_COMMENT = `
  mutation UpdateComment(
    $commentId: ID!
    $content: String!
  ) {
    updateComment(
      commentId: $commentId
      content: $content
    )
  }
`;

const DELETE_COMMENT = `
  mutation DeleteComment($commentId: ID!) {
    deleteComment(commentId: $commentId)
  }
`;

export function getTopLevelComments(
  postId: string,
  limit: number,
  afterId: string | null = null,
): Promise<TopLevelCommentsResponse> {
  return graphqlRequest<TopLevelCommentsResponse>(GET_TOP_LEVEL_COMMENTS, {
    postId,
    limit,
    afterId,
  });
}

export function getCommentReplies(
  parentId: string,
  limit: number,
  afterId: string | null = null,
): Promise<CommentRepliesResponse> {
  return graphqlRequest<CommentRepliesResponse>(GET_COMMENT_REPLIES, {
    parentId,
    limit,
    afterId,
  });
}

export function createComment(
  input: CreateCommentInput,
): Promise<CreateCommentResponse> {
  return graphqlRequest<CreateCommentResponse>(CREATE_COMMENT, input);
}

export function updateComment(
  commentId: string,
  content: string,
): Promise<UpdateCommentResponse> {
  return graphqlRequest<UpdateCommentResponse>(UPDATE_COMMENT, {
    commentId,
    content,
  });
}

export function deleteComment(
  commentId: string,
): Promise<DeleteCommentResponse> {
  return graphqlRequest<DeleteCommentResponse>(DELETE_COMMENT, { commentId });
}

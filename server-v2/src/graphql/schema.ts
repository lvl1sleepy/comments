import { createSchema } from "graphql-yoga";
import {
  getCommentSubtree,
  type CommentTreeRow,
} from "../repositories/comment.repository.js";
import {
  registerUser,
  loginUser,
  type RegisterUserInput,
  type LoginUserInput,
} from "../services/auth.service.js";
import { throwGraphQLError } from "./errors.js";
import { GraphQLError } from "graphql";
import type { GraphQLContext } from "./context.js";
import {
  createCommentService,
  deleteCommentService,
  updateCommentService,
  getTopLevelCommentsService,
  getCommentRepliesService,
} from "../services/comment.service.js";
import { requireAuth } from "./auth.js";

interface CreateCommentArgs {
  postId: string;
  parentId?: string | null;
  content: string;
}

interface UpdateCommentArgs {
  commentId: string;
  content: string;
}

interface DeleteCommentArgs {
  commentId: string;
}

interface TopLevelCommentsArgs {
  postId: string;
  afterId?: string | null;
  limit: number;
}

interface CommentRepliesArgs {
  parentId: string;
  afterId?: string | null;
  limit: number;
}

export const schema = createSchema<GraphQLContext>({
  typeDefs: /* GraphQL */ `
    type CommentAuthor {
      id: ID!
      username: String!
    }

    type Comment {
      id: ID!
      postId: ID!
      parentId: ID
      author: CommentAuthor
      content: String!
      depth: Int!
      isDeleted: Boolean!
      hasReplies: Boolean!
    }

    type CommentPage {
      items: [Comment!]!
      nextCursor: ID
      hasNextPage: Boolean!
    }

    type User {
      id: ID!
      username: String!
      email: String!
    }

    type AuthPayload {
      user: User!
      accessToken: String!
    }

    type Query {
      topLevelComments(postId: ID!, afterId: ID, limit: Int!): CommentPage!

      commentReplies(parentId: ID!, afterId: ID, limit: Int!): CommentPage!
    }

    type Mutation {
      register(username: String!, email: String!, password: String!): User!

      login(email: String!, password: String!): AuthPayload!

      createComment(postId: ID!, parentId: ID, content: String!): ID!

      updateComment(commentId: ID!, content: String!): ID!

      deleteComment(commentId: ID!): ID!
    }
  `,

  resolvers: {
    Comment: {
      postId: (parent: CommentTreeRow) => parent.post_id,

      parentId: (parent: CommentTreeRow) => parent.parent_id,

      isDeleted: (parent: CommentTreeRow) => parent.is_deleted,

      hasReplies: (parent: CommentTreeRow) => parent.has_replies,

      author: (
        parent: CommentTreeRow,
        _args: unknown,
        context: GraphQLContext,
      ) => {
        if (parent.is_deleted) {
          return null;
        }

        return context.loaders.author.load(parent.author_id);
      },
    },

    Query: {
      topLevelComments: async (
        _parent: unknown,
        args: TopLevelCommentsArgs,
      ) => {
        try {
          return await getTopLevelCommentsService({
            postId: args.postId,
            afterId: args.afterId ?? null,
            limit: args.limit,
          });
        } catch (error: unknown) {
          throwGraphQLError(error);
        }
      },

      commentReplies: async (_parent: unknown, args: CommentRepliesArgs) => {
        try {
          return await getCommentRepliesService({
            parentId: args.parentId,
            afterId: args.afterId ?? null,
            limit: args.limit,
          });
        } catch (error: unknown) {
          throwGraphQLError(error);
        }
      },
    },

    Mutation: {
      register: async (_parent: unknown, args: RegisterUserInput) => {
        try {
          return await registerUser(args);
        } catch (error: unknown) {
          throwGraphQLError(error);
        }
      },

      login: async (_parent: unknown, args: LoginUserInput) => {
        try {
          return await loginUser(args);
        } catch (error: unknown) {
          throwGraphQLError(error);
        }
      },

      createComment: async (
        _parent: unknown,
        args: CreateCommentArgs,
        context: GraphQLContext,
      ) => {
        const userId = requireAuth(context);

        try {
          return await createCommentService({
            postId: args.postId,
            parentId: args.parentId ?? null,
            content: args.content,
            authorId: userId,
          });
        } catch (error: unknown) {
          throwGraphQLError(error);
        }
      },

      updateComment: async (
        _parent: unknown,
        args: UpdateCommentArgs,
        context: GraphQLContext,
      ) => {
        const userId = requireAuth(context);

        try {
          return await updateCommentService({
            commentId: args.commentId,
            authorId: userId,
            content: args.content,
          });
        } catch (error: unknown) {
          throwGraphQLError(error);
        }
      },

      deleteComment: async (
        _parent: unknown,
        args: DeleteCommentArgs,
        context: GraphQLContext,
      ) => {
        const userId = requireAuth(context);

        try {
          return await deleteCommentService({
            commentId: args.commentId,
            authorId: userId,
          });
        } catch (error: unknown) {
          throwGraphQLError(error);
        }
      },
    },
  },
});

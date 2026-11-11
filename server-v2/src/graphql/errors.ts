import { GraphQLError } from "graphql";
import { AppError } from "../errors/app-error.js";

export function throwGraphQLError(error: unknown): never {
  if (error instanceof AppError) {
    throw new GraphQLError(error.message, {
      extensions: {
        code: error.code,
      },
    });
  }

  throw error;
}

import { GraphQLError } from "graphql";
import type { GraphQLContext } from "./context.js";

export function requireAuth(context: GraphQLContext): string {
  const userId = context.userId;

  if (!userId) {
    throw new GraphQLError("Authentication required", {
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  }

  return userId;
}

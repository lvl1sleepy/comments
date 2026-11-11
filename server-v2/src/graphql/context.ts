import { verifyAccessToken } from "../auth/token.js";
import { createAuthorLoader } from "./loaders.js";

export interface GraphQLContext {
  userId: string | null;
  loaders: {
    author: ReturnType<typeof createAuthorLoader>;
  };
}

export async function buildAuthContext(
  authorization: string | null,
): Promise<Pick<GraphQLContext, "userId">> {
  if (!authorization) {
    return { userId: null };
  }

  const match = /^Bearer ([^\s]+)$/i.exec(authorization.trim());
  const token = match?.[1];

  if (!token) {
    return { userId: null };
  }

  try {
    const userId = await verifyAccessToken(token);
    return { userId };
  } catch {
    return { userId: null };
  }
}

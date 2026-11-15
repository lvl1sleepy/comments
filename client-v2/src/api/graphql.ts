import { GraphQLRequestError } from "./errors";
import { getAccessToken, notifyAuthFailure } from "../features/auth/token";

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: {
    message: string;
    extensions?: {
      code?: string;
    };
  }[];
}

export async function graphqlRequest<T>(
  query: string,
  variables: object = {},
): Promise<T> {
  const url = import.meta.env.VITE_GRAPHQL_URL;

  if (!url) {
    throw new Error("VITE_GRAPHQL_URL is not configured");
  }

  const token = getAccessToken();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  let result: GraphQLResponse<T>;

  try {
    result = (await response.json()) as GraphQLResponse<T>;
  } catch {
    throw new Error(`Invalid server response (HTTP ${response.status})`);
  }

  if (result.errors?.length) {
    const error = result.errors[0];
    const code = error.extensions?.code;

    if (code === "UNAUTHENTICATED") {
      notifyAuthFailure(token);
    }

    throw new GraphQLRequestError(error.message, code);
  }

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  if (result.data == null) {
    throw new Error("GraphQL response is missing data");
  }

  return result.data;
}

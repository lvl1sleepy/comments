import { test } from "node:test";
import assert from "node:assert/strict";
import { createYoga, createSchema } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { schema } from "../graphql/schema.js";
import { createAuthorLoader } from "../graphql/loaders.js";
import { createSecurityPlugins } from "../graphql/security-plugins.js";
import type { GraphQLContext } from "../graphql/context.js";

function makeYoga(maxDepth: number) {
  return createYoga<{}, GraphQLContext>({
    schema,
    plugins: createSecurityPlugins(maxDepth),
    context: () => ({
      userId: null,
      loaders: {
        author: createAuthorLoader(),
      },
    }),
  });
}

let resolverCalls = 0;

const mockSchema = createSchema({
  typeDefs: `
    type Query {
      topLevelComments(postId: ID!, limit: Int!): CommentPage!
    }

    type CommentPage {
      items: [Comment!]!
    }

    type Comment {
      id: ID!
      content: String!
      author: CommentAuthor
    }

    type CommentAuthor {
      id: ID!
      username: String!
    }
  `,

  resolvers: {
    Query: {
      topLevelComments: () => {
        resolverCalls++;

        return {
          items: [
            {
              id: "1",
              content: "Test comment",
              author: {
                id: "1",
                username: "tester",
              },
            },
          ],
        };
      },
    },
  },
});

const yoga = makeYoga(5);
const strictDepthYoga = makeYoga(2);

type GraphQLResponse = {
  data?: Record<string, unknown>;
  errors?: Array<{
    message: string;
    extensions?: { code?: string };
  }>;
};

async function execute(
  instance: ReturnType<typeof makeYoga>,
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphQLResponse> {
  const response = await instance.fetch("http://localhost/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  return (await response.json()) as GraphQLResponse;
}

test("allows inexpensive GraphQL requests", async () => {
  const result = await execute(
    yoga,
    `
    query HealthCheck {
      __typename
    }
  `,
  );

  assert.equal(result.data?.__typename, "Query");
  assert.equal(result.errors, undefined);
});

test("rejects excessive query depth", async () => {
  const result = await execute(
    strictDepthYoga,
    `
    query TooDeep {
      topLevelComments(postId: "1", limit: 2) {
        items {
          author {
            username
          }
        }
      }
    }
  `,
  );

  assert.ok(result.errors?.some((error) => /depth/i.test(error.message)));
});

test("rejects more than 10 aliases", async () => {
  const fields = Array.from(
    { length: 11 },
    (_, index) => `
      alias${index}: topLevelComments(
        postId: "1"
        limit: 1
      ) {
        hasNextPage
      }
    `,
  ).join("\n");

  const result = await execute(yoga, `query TooManyAliases { ${fields} }`);

  assert.ok(
    result.errors?.some((error) =>
      /Aliases limit of 10 exceeded, found 11/i.test(error.message),
    ),
    `Expected alias-limit rejection, got: ${JSON.stringify(result)}`,
  );

  assert.equal(result.data, undefined);
});

test("rejects expensive pagination variables", async () => {
  const query = `
    query Page($limit: Int!) {
      topLevelComments(postId: "1", limit: $limit) {
        items {
          id
          content
          author {
            id
            username
          }
        }
      }
    }
  `;

  const result = await execute(yoga, query, {
    limit: 50,
  });

  assert.ok(
    result.errors?.some(
      (error) => error.extensions?.code === "QUERY_TOO_COMPLEX",
    ),
  );
});

test("complexity uses request variables independently", async () => {
  let resolverCalls = 0;

  // Mock schema: no PostgreSQL connection required.
  const mockSchema = createSchema({
    typeDefs: `
      type Query {
        topLevelComments(
          postId: ID!
          limit: Int!
        ): CommentPage!
      }

      type CommentPage {
        items: [Comment!]!
      }

      type Comment {
        id: ID!
        content: String!
        author: CommentAuthor
      }

      type CommentAuthor {
        id: ID!
        username: String!
      }
    `,

    resolvers: {
      Query: {
        topLevelComments: () => {
          resolverCalls++;

          return {
            items: [
              {
                id: "1",
                content: "Test comment",
                author: {
                  id: "1",
                  username: "tester",
                },
              },
            ],
          };
        },
      },
    },
  });

  const mockYoga = createYoga({
    schema: mockSchema,
    plugins: createSecurityPlugins(),
  });

  // Exactly the same document is used for all requests.
  const query = `
    query Page($limit: Int!) {
      topLevelComments(postId: "1", limit: $limit) {
        items {
          id
          content
          author {
            id
            username
          }
        }
      }
    }
  `;

  async function executeWithLimit(limit: number): Promise<GraphQLResponse> {
    const response = await mockYoga.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { limit },
      }),
    });

    return (await response.json()) as GraphQLResponse;
  }

  // Request 1: Expensive query must be rejected.
  const first = await executeWithLimit(50);

  assert.ok(
    first.errors?.some(
      (error) => error.extensions?.code === "QUERY_TOO_COMPLEX",
    ),
    `Expected complexity rejection: ${JSON.stringify(first)}`,
  );

  assert.equal(resolverCalls, 0);

  // Request 2: Same query, smaller limit should succeed.
  const second = await executeWithLimit(2);

  assert.equal(
    second.errors,
    undefined,
    `Expected successful query: ${JSON.stringify(second)}`,
  );

  assert.ok(second.data?.topLevelComments);
  assert.equal(resolverCalls, 1);

  // Request 3: Expensive query must still be rejected.
  const third = await executeWithLimit(50);

  assert.ok(
    third.errors?.some(
      (error) => error.extensions?.code === "QUERY_TOO_COMPLEX",
    ),
    `Expected complexity rejection: ${JSON.stringify(third)}`,
  );

  // Only the second request should have run the resolver.
  assert.equal(resolverCalls, 1);
});

test("invalid pagination limits are rejected", async () => {
  const query = `
    query InvalidPage($limit: Int!) {
      topLevelComments(postId: "1", limit: $limit) {
        hasNextPage
      }
    }
  `;

  for (const limit of [0, -1, 51]) {
    const result = await execute(yoga, query, { limit });

    assert.ok(
      result.errors?.length,
      `Expected limit ${limit} to fail: ${JSON.stringify(result)}`,
    );

    assert.ok(
      result.errors.every(
        (error) =>
          error.extensions?.code !== "QUERY_TOO_COMPLEX" &&
          error.extensions?.code !== "INTERNAL_SERVER_ERROR",
      ),
      `Expected an input-validation error for limit ${limit}: ${JSON.stringify(result)}`,
    );
  }
});

test("exposes expected errors but masks unexpected errors", async () => {
  const testSchema = createSchema({
    typeDefs: `
      type Query {
        expectedError: String!
        unexpectedError: String!
      }
    `,
    resolvers: {
      Query: {
        expectedError: () => {
          throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED",
            },
          });
        },

        unexpectedError: () => {
          throw new Error("Database connection failed: SECRET_TEST_VALUE");
        },
      },
    },
  });

  const testYoga = createYoga({
    schema: testSchema,

    // Explicitly test production-style error masking.
    maskedErrors: {
      isDev: false,
    },
  });

  async function run(query: string): Promise<GraphQLResponse> {
    const response = await testYoga.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    return (await response.json()) as GraphQLResponse;
  }

  // Expected application error: message and code are preserved.
  const expected = await run(`
    query {
      expectedError
    }
  `);

  assert.equal(expected.errors?.[0]?.message, "Authentication required");

  assert.equal(expected.errors?.[0]?.extensions?.code, "UNAUTHENTICATED");

  // Unexpected error: sensitive details must not be exposed.
  const unexpected = await run(`
    query {
      unexpectedError
    }
  `);

  assert.equal(unexpected.errors?.[0]?.message, "Unexpected error.");

  assert.ok(
    !JSON.stringify(unexpected).includes("SECRET_TEST_VALUE"),
    "Internal error details must not reach the client",
  );
});

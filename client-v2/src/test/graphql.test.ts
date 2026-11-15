import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { graphqlRequest } from "../api/graphql";
import {
  getAccessToken,
  setAccessToken,
  subscribeToAuthFailure,
} from "../features/auth/token";

describe("graphqlRequest", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GRAPHQL_URL", "http://localhost:4000/graphql");
    setAccessToken(null);
  });

  afterEach(() => {
    setAccessToken(null);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("preserves GraphQL error codes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [
            {
              message: "Invalid input",
              extensions: {
                code: "BAD_USER_INPUT",
              },
            },
          ],
        }),
      }),
    );

    await expect(graphqlRequest("query { __typename }")).rejects.toMatchObject({
      message: "Invalid input",
      code: "BAD_USER_INPUT",
    });
  });

  it("notifies the app about authentication failure", async () => {
    setAccessToken("test-token");

    const onAuthFailure = vi.fn();
    const unsubscribe = subscribeToAuthFailure(onAuthFailure);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        errors: [
          {
            message: "Authentication required",
            extensions: {
              code: "UNAUTHENTICATED",
            },
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(
        graphqlRequest("mutation { __typename }"),
      ).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });

      expect(onAuthFailure).toHaveBeenCalledOnce();

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    } finally {
      unsubscribe();
    }

    expect(getAccessToken()).toBe("test-token");
  });
});

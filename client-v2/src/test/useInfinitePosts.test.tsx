import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";

import { renderHook, waitFor } from "@testing-library/react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getPosts } from "../features/posts/api/posts.api";

import { useInfinitePosts } from "../features/posts/hooks/useInfinitePosts";

vi.mock("../features/posts/api/posts.api", () => ({
  getPosts: vi.fn(),
}));

describe("useInfinitePosts", () => {
  it("uses the cursor to fetch the next page", async () => {
    const mockedGetPosts = vi.mocked(getPosts);
    expect(vi.isMockFunction(getPosts)).toBe(true);

    mockedGetPosts.mockImplementation(async (limit, afterId) => {
      expect(limit).toBe(2);

      if (afterId === null) {
        return {
          posts: {
            items: [
              { id: "9", title: "Post 9", content: "A" },
              { id: "8", title: "Post 8", content: "B" },
            ],
            hasNextPage: true,
            nextCursor: "8",
          },
        };
      }

      if (afterId === "8") {
        return {
          posts: {
            items: [{ id: "7", title: "Post 7", content: "C" }],
            hasNextPage: false,
            nextCursor: null,
          },
        };
      }

      throw new Error(`Unexpected cursor: ${afterId}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useInfinitePosts(2), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(true);

    const nextResult = await result.current.fetchNextPage();

    expect(mockedGetPosts).toHaveBeenCalledWith(2, "8");

    // Verify the result of the second fetch itself.
    expect(nextResult.error).toBeNull();
    expect(nextResult.data?.pages).toHaveLength(2);

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
      expect(result.current.hasNextPage).toBe(false);
    });
  });
});

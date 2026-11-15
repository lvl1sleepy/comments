import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getCommentReplies } from "../features/comments/api/comments.api";
import { useReplies } from "../features/comments/hooks/useReplies";

vi.mock("../features/comments/api/comments.api", () => ({
  getCommentReplies: vi.fn(),
}));

describe("useReplies", () => {
  it("fetches replies only after expansion", async () => {
    const mockedGetReplies = vi.mocked(getCommentReplies);

    mockedGetReplies.mockResolvedValue({
      commentReplies: {
        items: [
          {
            id: "15",
            postId: "1",
            parentId: "12",
            content: "A reply",
            isDeleted: false,
            author: { id: "2", username: "testuser" },
          },
        ],
        hasNextPage: false,
        nextCursor: null,
      },
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

    const { result, rerender } = renderHook(
      ({ expanded }) => useReplies("12", expanded, 5),
      {
        wrapper,
        initialProps: { expanded: false },
      },
    );

    // No request before expansion.
    expect(mockedGetReplies).not.toHaveBeenCalled();

    // Simulate clicking "Show replies".
    rerender({ expanded: true });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedGetReplies).toHaveBeenCalledWith("12", 5, null);

    expect(result.current.data?.pages[0].commentReplies.items).toHaveLength(1);
  });
});

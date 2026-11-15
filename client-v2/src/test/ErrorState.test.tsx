import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorState from "../components/ErrorState";

describe("ErrorState", () => {
  it("displays the provided error message", () => {
    render(<ErrorState message="Failed to load posts" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load posts");
  });

  it("calls onRetry when the retry button is clicked", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(<ErrorState message="Network error" onRetry={onRetry} />);

    await user.click(
      screen.getByRole("button", {
        name: /try again/i,
      }),
    );

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("hides the retry button when no callback is provided", () => {
    render(<ErrorState message="An error occurred" />);

    expect(
      screen.queryByRole("button", {
        name: /try again/i,
      }),
    ).not.toBeInTheDocument();
  });
});

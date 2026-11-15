import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingState from "../components/LoadingState";

describe("LoadingState", () => {
  it("renders the default loading message", () => {
    render(<LoadingState />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading...");
  });

  it("renders a custom loading message", () => {
    render(<LoadingState message="Loading posts..." />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading posts...");
  });
});

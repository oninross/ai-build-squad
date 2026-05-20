import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders scaffold headline", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /ai build squad scaffold/i })).toBeInTheDocument();
  });
});

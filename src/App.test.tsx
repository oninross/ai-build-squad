import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders scaffold headline and description", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /ai build squad scaffold/i })).toBeInTheDocument();
    expect(
      screen.getByText(/react \+ typescript \+ scss \+ vitest \+ playwright \+ storybook/i)
    ).toBeInTheDocument();
  });

  it("renders a main landmark shell", () => {
    render(<App />);

    const main = screen.getByRole("main");

    expect(main).toHaveClass("app-shell");
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renders its children as text content", () => {
    render(<Chip>Connected</Chip>);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("is not a button and has no click behavior by default (static chip)", () => {
    render(<Chip>sess_8f2a41</Chip>);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders as a clickable button when onClick is given, calling it on click", () => {
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>All</Chip>);
    const button = screen.getByRole("button", { name: "All" });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies the active class when active is true", () => {
    const { rerender, container } = render(
      <Chip onClick={() => {}} active>
        All
      </Chip>,
    );
    expect(container.querySelector(".chip")).toHaveClass("chip--active");

    rerender(
      <Chip onClick={() => {}} active={false}>
        All
      </Chip>,
    );
    expect(container.querySelector(".chip")).not.toHaveClass("chip--active");
  });
});

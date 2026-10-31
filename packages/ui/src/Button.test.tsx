import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("defaults to the primary variant", () => {
    render(<Button>End call</Button>);
    expect(screen.getByRole("button")).toHaveClass("button--primary");
  });

  it("renders the ghost variant when requested", () => {
    render(<Button variant="ghost">Export trace</Button>);
    expect(screen.getByRole("button")).toHaveClass("button--ghost");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>End call</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects the disabled prop", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        End call
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

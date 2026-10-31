import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { StatusDot } from "./StatusDot";

describe("StatusDot", () => {
  it.each([
    ["ok", "status-dot--ok"],
    ["warn", "status-dot--warn"],
    ["bad", "status-dot--bad"],
    ["neutral", "status-dot--neutral"],
  ] as const)("renders the %s tone with class %s", (tone, expectedClass) => {
    const { container } = render(<StatusDot tone={tone} />);
    const dot = container.querySelector(".status-dot");
    expect(dot).not.toBeNull();
    expect(dot).toHaveClass(expectedClass);
  });

  it("exposes the tone via an accessible label when `label` is given", () => {
    const { getByLabelText } = render(<StatusDot tone="ok" label="Connected" />);
    expect(getByLabelText("Connected")).toBeInTheDocument();
  });
});

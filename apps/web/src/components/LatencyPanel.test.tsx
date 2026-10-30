import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { LatencyPanel } from "./LatencyPanel";

describe("LatencyPanel", () => {
  it("renders the p50 and p95 values each as '<value> ms'", () => {
    render(<LatencyPanel p50={342} p95={418} />);
    expect(document.body.textContent).toContain("342 ms");
    expect(document.body.textContent).toContain("418 ms");
  });

  it("labels the metrics P50 and P95", () => {
    render(<LatencyPanel p50={0} p95={0} />);
    expect(document.body.textContent).toMatch(/P50/i);
    expect(document.body.textContent).toMatch(/P95/i);
  });

  it("renders a root element with a stable, stylable class name", () => {
    const { container } = render(<LatencyPanel p50={0} p95={0} />);
    expect(container.querySelector(".latency-panel")).not.toBeNull();
  });

  it("renders '0 ms' for both metrics when both are 0", () => {
    render(<LatencyPanel p50={0} p95={0} />);
    const matches = document.body.textContent?.match(/0 ms/g) ?? [];
    expect(matches.length).toBe(2);
  });
});

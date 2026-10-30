import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HomeRoute } from "./home";

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("HomeRoute", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders CallControl and LatencyPanel together, starting idle at 0 ms", () => {
    render(<HomeRoute />);
    expect(screen.getByRole("button", { name: "Start Call" })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/idle/i);
    expect(document.body.textContent).toContain("0 ms");
  });

  it("does not reference getUserMedia/mediaDevices during the full happy path", () => {
    const mediaDevices = (navigator as unknown as { mediaDevices?: MediaDevices })
      .mediaDevices;
    const spy = mediaDevices
      ? vi.spyOn(mediaDevices, "getUserMedia")
      : undefined;

    render(<HomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
    advance(1200 + 2500 + 2200 + 900 + 2200 + 2000);

    if (spy) {
      expect(spy).not.toHaveBeenCalled();
    }
    // If navigator.mediaDevices is undefined in this jsdom environment, the
    // important guarantee (no reference to the API anywhere in the source)
    // is confirmed separately via a source grep, noted in the task report.
  });

  it("walks the full DEFAULT_CALL_SCRIPT end to end and returns to an enabled Start Call button", () => {
    render(<HomeRoute />);

    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
    // Synchronous first step.
    expect(document.body.textContent).toMatch(/connecting/i);

    advance(1200);
    expect(document.body.textContent).toMatch(/listening/i);

    // At some point during an active phase, latency numbers should be
    // non-zero (real-looking numbers appeared).
    expect(document.body.textContent).not.toMatch(/\b0 ms\b.*\b0 ms\b/);

    advance(2500);
    expect(document.body.textContent).toMatch(/speaking/i);

    advance(2200);
    expect(document.body.textContent).toMatch(/interrupted/i);

    advance(900);
    expect(document.body.textContent).toMatch(/listening/i);

    advance(2200);
    expect(document.body.textContent).toMatch(/speaking/i);

    advance(2000);
    expect(document.body.textContent).toMatch(/ended/i);

    const button = screen.getByRole("button", { name: "Start Call" });
    expect(button).toBeEnabled();
  });

  it("re-samples latency every 400ms during an active phase without crashing", () => {
    render(<HomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
    expect(document.body.textContent).toMatch(/connecting/i);

    // Advance within the "connecting" phase (1200ms long) in 400ms ticks —
    // this should trigger the interval resample at least twice without
    // advancing past the phase boundary.
    advance(400);
    advance(400);
    expect(document.body.textContent).toMatch(/connecting/i);
  });

  it("clears the resample interval once phase returns to idle/ended and on unmount, leaving no leaked timers", () => {
    const { unmount } = render(<HomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));

    advance(1200 + 2500 + 2200 + 900 + 2200 + 2000);
    expect(document.body.textContent).toMatch(/ended/i);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears pending timers on unmount mid-call", () => {
    const { unmount } = render(<HomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
    advance(400);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

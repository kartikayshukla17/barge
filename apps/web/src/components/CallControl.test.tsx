import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CallControl } from "./CallControl";
import type { CallState } from "../lib/callSimulator";

const STATUS_WORDS: Record<CallState, string> = {
  idle: "Idle",
  connecting: "Connecting",
  listening: "Listening",
  speaking: "Speaking",
  interrupted: "Interrupted",
  ended: "Ended",
};

describe("CallControl", () => {
  it.each(Object.entries(STATUS_WORDS) as [CallState, string][])(
    "renders a status line containing %s for phase %s",
    (phase, word) => {
      render(<CallControl phase={phase} onStart={vi.fn()} />);
      expect(document.body.textContent).toMatch(new RegExp(word, "i"));
    },
  );

  it("shows an enabled 'Start Call' button when idle, which calls onStart once when clicked", () => {
    const onStart = vi.fn();
    render(<CallControl phase="idle" onStart={onStart} />);

    const button = screen.getByRole("button", { name: "Start Call" });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("shows an enabled 'Start Call' button when ended, which calls onStart once when clicked", () => {
    const onStart = vi.fn();
    render(<CallControl phase="ended" onStart={onStart} />);

    const button = screen.getByRole("button", { name: "Start Call" });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it.each(["connecting", "listening", "speaking", "interrupted"] as CallState[])(
    "disables the button with 'Call in progress…' text during phase %s and ignores clicks",
    (phase) => {
      const onStart = vi.fn();
      render(<CallControl phase={phase} onStart={onStart} />);

      const button = screen.getByRole("button", { name: "Call in progress…" });
      expect(button).toBeDisabled();

      // Fire a click anyway to verify the handler is never invoked.
      fireEvent.click(button);
      expect(onStart).not.toHaveBeenCalled();
    },
  );

  it("renders a decorative, non-interactive mic icon marked aria-hidden", () => {
    const onStart = vi.fn();
    render(<CallControl phase="idle" onStart={onStart} />);

    const mic = document.querySelector('[aria-hidden="true"]');
    expect(mic).not.toBeNull();
    expect(mic?.tagName.toLowerCase()).not.toBe("button");

    if (mic) {
      fireEvent.click(mic);
    }
    expect(onStart).not.toHaveBeenCalled();
  });
});

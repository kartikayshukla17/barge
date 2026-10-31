import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { StageTag } from "./StageTag";

describe("StageTag", () => {
  it.each(["net", "stt", "llm", "tts"] as const)(
    "renders the %s stage with its own class and label",
    (stage) => {
      const { container, getByText } = render(<StageTag stage={stage} />);
      expect(getByText(stage)).toBeInTheDocument();
      expect(container.querySelector(".stage-tag")).toHaveClass(
        `stage-tag--${stage}`,
      );
    },
  );
});

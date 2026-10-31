import "./StageTag.css";

export type Stage = "net" | "stt" | "llm" | "tts";

export interface StageTagProps {
  stage: Stage;
}

export function StageTag({ stage }: StageTagProps) {
  return <span className={`stage-tag stage-tag--${stage}`}>{stage}</span>;
}

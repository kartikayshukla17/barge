import type { ReactNode } from "react";
import "./Chip.css";

export interface ChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export function Chip({ children, active = false, onClick }: ChipProps) {
  const className = [
    "chip",
    onClick ? "chip--clickable" : "",
    active ? "chip--active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {children}
      </button>
    );
  }

  return <span className={className}>{children}</span>;
}

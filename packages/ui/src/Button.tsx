import type { ReactNode } from "react";
import "./Button.css";

export interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Button({
  children,
  variant = "primary",
  onClick,
  disabled = false,
  className = "",
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`button button--${variant} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

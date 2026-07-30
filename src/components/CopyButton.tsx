import { useEffect, useRef, useState, type ReactNode } from "react";

interface CopyButtonProps {
  text: string;
  toolSlug?: string;
  className?: string;
  ariaLabel?: string;
  children?: ReactNode;
  disabled?: boolean;
}

export function CopyButton({
  text,
  className = "",
  ariaLabel,
  children,
  disabled = false,
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  const showTemporaryState = (next: "copied" | "failed") => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    setState(next);
    resetTimer.current = window.setTimeout(() => {
      setState("idle");
      resetTimer.current = null;
    }, 2000);
  };

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showTemporaryState("copied");
    } catch {
      showTemporaryState("failed");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled || !text}
      className={`copy-button ${className} ${state}`.trim()}
      aria-label={
        state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Copy failed"
            : ariaLabel
      }
      aria-live="polite"
    >
      {state === "copied"
        ? "Copied"
        : state === "failed"
          ? "Copy failed"
          : children || "Copy"}
    </button>
  );
}

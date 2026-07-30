import type { ReactNode } from "react";

export function ToolActions({ children }: { children: ReactNode }) {
  return <div className="button-group">{children}</div>;
}

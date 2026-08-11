import type { ReactNode } from "react";

export function ToolActions({
  children,
  sticky = false,
}: {
  children: ReactNode;
  sticky?: boolean;
}) {
  return (
    <div className={`button-group${sticky ? " sticky-action-bar" : ""}`}>
      {children}
    </div>
  );
}

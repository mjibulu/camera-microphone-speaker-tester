import type { ReactNode } from "react";

interface OptionFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}

export function OptionField({
  label,
  htmlFor,
  hint,
  children,
}: OptionFieldProps) {
  return (
    <div className="option-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

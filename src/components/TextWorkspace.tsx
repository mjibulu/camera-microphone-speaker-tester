import type { ReactNode } from "react";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  rows?: number;
  actions?: ReactNode;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
  rows = 8,
  actions,
}: TextFieldProps) {
  return (
    <div className="text-editor">
      <div className="editor-header">
        <label className="editor-label" htmlFor={id}>
          {label}
        </label>
        {!readOnly && (actions || value) ? (
          <div className="editor-actions">
            {actions}
            {value ? (
              <button
                type="button"
                className="clear-button"
                onClick={() => onChange?.("")}
                aria-label="Clear text"
              >
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`editor-textarea ${readOnly ? "readonly" : ""}`.trim()}
        rows={rows}
        aria-live={readOnly ? "polite" : undefined}
      />
    </div>
  );
}

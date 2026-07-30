interface ValidationMessageProps {
  type: "error" | "success";
  message: string;
}

export function ValidationMessage({
  type,
  message,
}: ValidationMessageProps) {
  return (
    <p
      className={`validation-message ${type}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
}

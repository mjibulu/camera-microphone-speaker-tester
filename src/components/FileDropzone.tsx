import { useEffect, useRef, useState } from "react";

interface FileDropzoneProps {
  accept: string;
  onFileSelected?: (file: File) => void | Promise<void>;
  onFilesSelected?: (files: File[]) => void | Promise<void>;
  onSelectionError?: (error: unknown) => void;
  label: string;
  hint?: string;
  multiple?: boolean;
  ariaLabel?: string;
}

export function FileDropzone({
  accept,
  onFileSelected,
  onFilesSelected,
  onSelectionError,
  label,
  hint,
  multiple = false,
  ariaLabel,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const callbacksRef = useRef({
    onFileSelected,
    onFilesSelected,
    onSelectionError,
  });
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingRef = useRef(0);
  const mountedRef = useRef(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    callbacksRef.current = {
      onFileSelected,
      onFilesSelected,
      onSelectionError,
    };
  }, [onFileSelected, onFilesSelected, onSelectionError]);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const handleFiles = (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (selected.length === 0) return;
    const batch = multiple ? selected : selected.slice(0, 1);
    pendingRef.current += 1;
    setProcessing(true);
    queueRef.current = queueRef.current
      .catch(() => undefined)
      .then(async () => {
        const callbacks = callbacksRef.current;
        try {
          if (callbacks.onFilesSelected) {
            await callbacks.onFilesSelected(batch);
          } else if (callbacks.onFileSelected) {
            await callbacks.onFileSelected(batch[0]);
          }
        } catch (error) {
          callbacks.onSelectionError?.(error);
        } finally {
          await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
          pendingRef.current -= 1;
          if (mountedRef.current && pendingRef.current === 0) {
            setProcessing(false);
          }
        }
      });
  };

  return (
    <div
      className="file-dropzone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        handleFiles(event.dataTransfer.files);
      }}
      onClick={(event) => {
        if (event.target !== inputRef.current) inputRef.current?.click();
      }}
      role="button"
      tabIndex={0}
      aria-busy={processing}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <p>{label}</p>
      {hint ? <p>{hint}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-label={ariaLabel ?? label}
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <span className="sr-only" role="status" aria-live="polite">
        {processing ? "Processing selected files" : ""}
      </span>
    </div>
  );
}

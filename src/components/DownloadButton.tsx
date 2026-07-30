import type { ReactNode } from "react";
import { saveBlob } from "../lib/save-file";

interface DownloadButtonProps {
  content: string;
  filename: string;
  toolSlug?: string;
  mimeType?: string;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
}

export function DownloadButton({
  content,
  filename,
  mimeType = "text/plain",
  className = "",
  children,
  disabled = false,
}: DownloadButtonProps) {
  const handleDownload = async () => {
    if (!content) return;
    await saveBlob(new Blob([content], { type: mimeType }), filename);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled || !content}
      className={`download-button ${className}`.trim()}
    >
      {children || "Download"}
    </button>
  );
}

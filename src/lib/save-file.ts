export type SaveFileResult = "downloaded" | "shared" | "cancelled";

function safeDownloadName(filename: string): string {
  const forbidden = new Set('<>:"/\\|?*'.split(""));
  return (
    [...filename]
      .map((character) =>
        character.charCodeAt(0) <= 31 || forbidden.has(character)
          ? "-"
          : character,
      )
      .join("")
      .replace(/\s+/gu, " ")
      .trim()
      .slice(0, 180) || "download"
  );
}

function isAppleMobileDevice(
  navigatorValue: Pick<
    Navigator,
    "userAgent" | "platform" | "maxTouchPoints"
  >,
): boolean {
  return (
    /iPad|iPhone|iPod/iu.test(navigatorValue.userAgent) ||
    (navigatorValue.platform === "MacIntel" &&
      navigatorValue.maxTouchPoints > 1)
  );
}

function canShareFile(file: File): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function"
  ) {
    return false;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function saveBlob(
  blob: Blob,
  filename: string,
): Promise<SaveFileResult> {
  const safeName = safeDownloadName(filename);
  const appleMobile =
    typeof navigator !== "undefined" && isAppleMobileDevice(navigator);

  if (appleMobile && typeof File === "function") {
    const file = new File([blob], safeName, {
      type: blob.type || "application/octet-stream",
      lastModified: Date.now(),
    });
    if (canShareFile(file)) {
      try {
        await navigator.share({ files: [file], title: safeName });
        return "shared";
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return "cancelled";
        }
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}

export type MediaDeviceErrorKey =
  | "cameraDenied"
  | "microphoneDenied"
  | "cameraMissing"
  | "microphoneMissing"
  | "cameraStart"
  | "microphoneStart";

export function classifyMediaDeviceError(
  error: unknown,
  device: "camera" | "microphone",
): MediaDeviceErrorKey {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return device === "camera" ? "cameraDenied" : "microphoneDenied";
  }
  if (name === "NotFoundError") {
    return device === "camera" ? "cameraMissing" : "microphoneMissing";
  }
  return device === "camera" ? "cameraStart" : "microphoneStart";
}

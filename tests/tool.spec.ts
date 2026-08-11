import { expect, test } from "@playwright/test";
import { createExternalRequestGuard } from "../src/lib/network-guard";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state = { stoppedTracks: 0, played: 0 };
    Object.assign(window, { __mediaTestState: state });
    class FakeTrack extends EventTarget {
      stop() {
        state.stoppedTracks += 1;
      }
    }
    const stream = (kind: "video" | "audio") => {
      const track = new FakeTrack();
      return {
        getTracks: () => [track],
        getVideoTracks: () => (kind === "video" ? [track] : []),
        getAudioTracks: () => (kind === "audio" ? [track] : []),
      };
    };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: async () => [
          { kind: "videoinput", deviceId: "camera-1", label: "Test camera" },
          {
            kind: "audioinput",
            deviceId: "microphone-1",
            label: "Test microphone",
          },
          { kind: "audiooutput", deviceId: "speaker-1", label: "Test speaker" },
        ],
        getUserMedia: async (constraints: MediaStreamConstraints) =>
          stream(constraints.video ? "video" : "audio"),
        addEventListener() {},
        removeEventListener() {},
      },
    });
    class FakeMediaRecorder {
      static isTypeSupported() {
        return true;
      }
      state: RecordingState = "inactive";
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({
          data: new Blob(["sample"], { type: this.mimeType }),
        });
        this.onstop?.();
      }
    }
    Object.assign(window, { MediaRecorder: FakeMediaRecorder });
    class FakeAudioContext {
      createAnalyser() {
        return {
          fftSize: 512,
          smoothingTimeConstant: 0,
          getByteTimeDomainData: (values: Uint8Array) => values.fill(128),
        };
      }
      createMediaStreamSource() {
        return { connect() {} };
      }
      async close() {}
    }
    Object.assign(window, { AudioContext: FakeAudioContext });
    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = () => undefined;
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get: () => null,
      set: () => undefined,
    });
    Object.defineProperty(HTMLMediaElement.prototype, "setSinkId", {
      configurable: true,
      value: async () => undefined,
    });
    HTMLMediaElement.prototype.play = async function () {
      state.played += 1;
    };
    HTMLMediaElement.prototype.pause = () => undefined;
    window.requestAnimationFrame = () => 1;
    window.cancelAnimationFrame = () => undefined;
  });
});

test("camera, microphone recording, and speakers stay local", async ({
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  const networkGuard = createExternalRequestGuard(baseURL);
  page.on("request", (request) => networkGuard.inspect(request.url()));

  await page.goto("/");
  const camera = page.getByRole("region", { name: "Camera" });
  const microphone = page.getByRole("region", { name: "Microphone" });
  await camera.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("status")).toContainText("Active");
  await camera.getByRole("button", { name: "Stop" }).click();

  await microphone.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: /Stop recording/u }).click();
  await expect(
    page.getByLabel("Recorded microphone sample playback"),
  ).toBeVisible();
  await microphone.getByRole("button", { name: "Stop" }).click();

  await page.getByRole("button", { name: "Left" }).click();
  await expect(page.getByText("Playing")).toBeVisible();
  const deviceState = await page.evaluate(
    () =>
      (
        window as unknown as {
          __mediaTestState: { stoppedTracks: number; played: number };
        }
      ).__mediaTestState,
  );
  expect(deviceState.stoppedTracks).toBeGreaterThanOrEqual(2);
  expect(deviceState.played).toBeGreaterThanOrEqual(1);

  networkGuard.assertNoExternalRequests();
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { App } from "./App";

const stoppedTracks: Array<ReturnType<typeof vi.fn>> = [];

class FakeTrack extends EventTarget {
  stop = vi.fn();

  constructor() {
    super();
    stoppedTracks.push(this.stop);
  }
}

function fakeStream(kind: "video" | "audio") {
  const track = new FakeTrack();
  return {
    getTracks: () => [track],
    getVideoTracks: () => (kind === "video" ? [track] : []),
    getAudioTracks: () => (kind === "audio" ? [track] : []),
  } as unknown as MediaStream;
}

class FakeMediaRecorder {
  static isTypeSupported() {
    return true;
  }

  state: RecordingState = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["sample"], { type: this.mimeType }),
    } as BlobEvent);
    this.onstop?.();
  }
}

describe("Camera, Microphone & Speaker Tester", () => {
  beforeEach(() => {
    stoppedTracks.length = 0;
    const enumerateDevices = vi.fn().mockResolvedValue([
      { kind: "videoinput", deviceId: "camera-1", label: "Test camera" },
      { kind: "audioinput", deviceId: "microphone-1", label: "Test microphone" },
      { kind: "audiooutput", deviceId: "speaker-1", label: "Test speaker" },
    ]);
    const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) =>
      fakeStream(constraints.video ? "video" : "audio"),
    );
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices,
        getUserMedia,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: FakeMediaRecorder,
    });
    Object.defineProperty(globalThis, "AudioContext", {
      configurable: true,
      value: class {
        createAnalyser() {
          return {
            fftSize: 512,
            smoothingTimeConstant: 0,
            getByteTimeDomainData: (values: Uint8Array) => values.fill(128),
          };
        }
        createMediaStreamSource() {
          return { connect: vi.fn() };
        }
        close = vi.fn().mockResolvedValue(undefined);
      },
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn().mockReturnValue("blob:test"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
      () => undefined,
    );
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
      () => undefined,
    );
  });

  it("starts and stops camera and microphone tracks", async () => {
    const user = userEvent.setup();
    render(<App />);
    const camera = screen.getByRole("region", { name: "Camera" });
    const microphone = screen.getByRole("region", { name: "Microphone" });

    await user.click(within(camera).getByRole("button", { name: "Start" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Active");
    await user.click(within(camera).getByRole("button", { name: "Stop" }));
    expect(stoppedTracks[0]).toHaveBeenCalled();

    await user.click(
      within(microphone).getByRole("button", { name: "Start" }),
    );
    expect(
      await screen.findByRole("button", { name: /Stop recording/u }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Stop recording/u }));
    expect(
      await screen.findByLabelText("Recorded microphone sample playback"),
    ).toBeInTheDocument();
    await user.click(
      within(microphone).getByRole("button", { name: "Stop" }),
    );
    expect(stoppedTracks[1]).toHaveBeenCalled();
  });

  it("plays a selected speaker channel", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Output" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Left" }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.getByText("Playing")).toBeInTheDocument();
  });
});

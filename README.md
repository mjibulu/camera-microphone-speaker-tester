# Camera, Microphone & Speaker Tester

Test selected cameras, microphones, and speakers with live previews, input levels, sample playback, and stereo tones.

[Features](#features) · [Usage](#usage) · [Run locally](#run-locally) · [Contributing](./.github/CONTRIBUTING.md) · [Licence](./LICENSE)

## Features

- Separate camera and microphone start controls, so only the hardware being tested is activated
- Live preview for the selected camera with switching between available video devices
- Real-time microphone level meter for checking input sensitivity and activity
- Automatic microphone sample recording with playback, stop, and discard controls
- Left-channel, right-channel, and stereo speaker test tones
- Output-device selection where the browser supports speaker routing
- Persistent on-screen hardware status plus one-click cleanup of every active media track and audio resource

## Screenshot

![Camera, Microphone & Speaker Tester screenshot](./public/tool-preview.webp)

## Usage

1. Open the Camera, Microphone, or Speakers panel for the hardware you want to check.
2. Start the camera or microphone and approve only the permission requested by the browser.
3. Select a device, then watch the camera preview or microphone level and replay the automatically recorded sample.
4. Choose an output device when available and play the left, stereo, and right test tones.
5. Stop each test individually or use Stop all hardware to release every active device.

## Browser support

Works with current versions of Chrome/Chromium, Firefox, and Safari.

- Camera and microphone tests require HTTPS or localhost and explicit browser permission.
- Selecting a specific speaker is not supported by every browser; channel test tones still use the active system output.
- Another application using a device exclusively may prevent that device from starting.

## Run locally

You’ll need Git, Corepack, and Node.js 22.13.x or 24.x.

```bash
git clone https://github.com/mjibulu/camera-microphone-speaker-tester.git
cd camera-microphone-speaker-tester
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

Open the local URL shown in the terminal.

## Checks

```bash
pnpm run check
pnpm run verify
```

## Build

```bash
pnpm run build
```

The production files are created in `dist/` and can be hosted on GitHub Pages, Netlify, Cloudflare Pages, Vercel, or any static host.

## Privacy

The app runs in your browser and does not include analytics, ads, or telemetry.

This tool does not require persistent browser storage.

This tool uses: AudioContext, HTMLMediaElement.setSinkId, MediaDevices, MediaRecorder, URL.createObjectURL. Availability may vary by browser.

## Contributing

Issues and pull requests are welcome. See the [contribution guide](./.github/CONTRIBUTING.md) before submitting changes.

## Credits

Created by Mujeeb for [eBURP](https://eburp.com/).

## Licence

Licensed under the [MIT Licence](./LICENSE). Third-party dependencies keep their respective licences.

# Camera, Microphone & Speaker Tester

Test selected cameras, microphones, and speakers independently with live previews, input levels, sample playback, and stereo tones.

## Features

- Independent camera and microphone permission requests
- Selected camera preview and microphone input meter
- Automatic microphone sample recording and playback
- Left, right, and stereo speaker test tones
- Immediate media-track and audio-resource cleanup

## Screenshot

![Camera, Microphone & Speaker Tester interface](./public/tool-preview.webp)

## Browser support and limitations

The current stable releases of Chromium, Firefox, and Safari are supported.

- Camera and microphone tests require HTTPS or localhost and explicit browser permission.
- Selecting a specific speaker is not supported by every browser; channel test tones still use the active system output.
- Another application using a device exclusively may prevent that device from starting.

## Run locally

Requirements:

- Node.js 24.x
- Corepack

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

## Verify

Fast checks:

```bash
pnpm run check
```

Complete browser verification:

```bash
pnpm run verify
```

## Build and host

```bash
pnpm run build
```

Upload the contents of `dist/` to a static host. The application supports both
root and subdirectory hosting and needs no environment variables.

The same output can be deployed with GitHub Pages, Netlify, Cloudflare Pages,
Vercel static hosting, or an ordinary file upload.

## Data and network behaviour

The application ships without analytics or telemetry. Tool processing occurs
in the browser, and the primary browser tests fail unexpected external
requests. See [PRIVACY.md](./PRIVACY.md) for the storage and browser API
inventory.

## Contributing

Issues and pull requests are welcome. Read
[CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a change.

## Credits

Created by M. Jibulu for [eBURP](https://eburp.com/).

## Licence

Original code is available under the [MIT Licence](./LICENSE). Dependencies and
assets retain their own licences; see
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

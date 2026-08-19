# Music Pulse

Music Pulse is a local-first browser visualizer that finds energy peaks in an uploaded audio file and turns them into a playable path. The path advances with the audio clock, changes direction at detected moments, and exposes those moments on a seekable timeline.

## Live demo

Open the published browser version at <https://holynova.github.io/music_pulse/>.

## Run locally

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite. Audio is decoded and analyzed in the browser. No file upload, account, API key, or server is required.

## Commands

```bash
pnpm test   # beat detection and trajectory tests
pnpm lint   # ESLint
pnpm build  # TypeScript and production build
```

## How the pulse map works

1. The selected file is decoded with the Web Audio API.
2. Music energy is sampled into a short-time envelope.
3. Adaptive thresholds, local peaks, and a minimum gap produce the pulse markers.
4. The marker timestamps generate a deterministic trajectory.
5. The canvas and timeline follow `HTMLAudioElement.currentTime`, so pause, seek, and replay stay aligned.

The detector identifies prominent onsets and energy changes. It is intentionally not a BPM or musical-bar inference engine, so sensitivity and minimum-gap controls are exposed for different kinds of tracks.

## Included sample

The empty state includes three one-click demo tracks so the visualizer can be explored with different kinds of music:

- **Play House - FREE** by Play House, a modern House track marked **CC0 1.0 Universal**.
- **Country Club** by Scott Joplin, a piano ragtime recording whose composition and recording are marked public domain.
- **Piano Concerto in A minor** by Edvard Grieg, a classical recording released into the public domain by Musopen.

The bundled files are local 160 kbps MP3 derivatives used as demo assets. Source, license, download links, and file hashes are recorded in [`public/audio/README.md`](public/audio/README.md).

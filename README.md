# HarmonicaOS

Assistive technology that turns harmonica playing into computer control. Play a note, fire a command. Built with Web Audio, YIN pitch detection, and (optionally) Tauri for native key injection.

**Live:** https://harmonica-os.vercel.app
**Repo:** https://github.com/ramusallam/harmonica-os

## What it does

You play a diatonic harmonica into your microphone. The app detects which scale degree you're playing in real time and maps it to a keyboard command:

| Degree | Note (key of C) | Default command |
|--------|-----------------|-----------------|
| 1 (root) | C | Right Arrow |
| 4 (fourth) | F | Spacebar |
| 5 (fifth) | G | Left Arrow |

Three operational modes:

- **Learn Mode** — guided practice with live feedback, hit tracking, streak counter
- **Control Mode (browser)** — fires DOM keyboard events within the page
- **Control Mode (desktop)** — fires OS-level keypresses via Tauri + Rust (requires desktop build)

## Requirements

- Node.js 18+, npm 9+
- A microphone
- A diatonic harmonica (any key — the app adapts)
- Chrome 66+, Firefox 76+, Safari 14.1+, or Edge 79+

For desktop mode only:
- Rust toolchain (`rustup`)
- Tauri CLI 2 (`cargo install tauri-cli`)

## Setup

```bash
git clone https://github.com/ramusallam/harmonica-os.git
cd harmonica-os
npm install
```

## Local development (browser mode)

```bash
npm run dev
# → http://localhost:3000
```

This starts the Next.js dev server. All features work except native key injection (desktop only). The "Browser Demo" control mode fires in-page DOM events for testing.

## Local development (desktop mode)

Requires Rust and Tauri CLI installed.

```bash
# Start the web dev server first
npm run dev

# In a second terminal, launch Tauri
npm run tauri:dev
```

This opens a native window pointing at `localhost:3000`. Desktop control mode uses `enigo` (Rust) to inject real keypresses into the OS.

## Project structure

```
harmonica-os/
├── apps/
│   ├── web/                 # Next.js 15 web app (deployed on Vercel)
│   │   ├── src/
│   │   │   ├── app/         # Pages: home, calibrate, learn, control, settings, debug
│   │   │   ├── components/  # React components (audio, harmonica, layout, shared)
│   │   │   ├── hooks/       # useAudioEngine, usePitchDetector, useSettings
│   │   │   ├── lib/         # Browser-specific logic
│   │   │   │   ├── audio/   # Mic capture, AudioWorklet engine
│   │   │   │   ├── pitch/   # YIN algorithm, smoother, detector
│   │   │   │   ├── calibration/  # Sample collection, frequency matcher
│   │   │   │   ├── commands/     # State machine, command gate
│   │   │   │   ├── learn/        # Lesson engine
│   │   │   │   └── storage/      # localStorage persistence
│   │   │   └── types/       # TypeScript interfaces
│   │   └── public/          # Static assets, AudioWorklet file, PWA manifest
│   └── desktop/             # Tauri 2 desktop wrapper
│       └── src-tauri/       # Rust source: key injection, safety controls
├── packages/
│   ├── core/                # Framework-agnostic logic (no DOM, no React)
│   │   └── src/
│   │       ├── commands/    # CommandDispatcher interface, mappers
│   │       └── harmonica/   # Tuning tables, degree mapping, scale math
│   └── ui/                  # Shared React component library
├── docs/                    # Architecture decisions
├── ARCHITECTURE.md          # System overview
├── USER-GUIDE.md            # End-user documentation
├── BETA-TEST.md             # Manual test cases
└── RELEASE-CHECKLIST.md     # Deployment checklist for new versions
```

### The split rule

`packages/core` = pure TypeScript, no browser APIs, no React. If it touches the DOM, Web Audio, or React, it goes in `apps/web/src/lib/`.

## Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build (verifies types + lint)
npm run lint         # ESLint
npm run tauri:dev    # Launch Tauri desktop app (dev mode)
npm run tauri:build  # Build Tauri desktop binary
```

## Deployment (Vercel)

No environment variables needed. No backend. The app is a static Next.js build.

```bash
# First time
npm i -g vercel
vercel link
npx vercel --prod --yes

# Subsequent deploys
npx vercel --prod --yes
```

Or connect the GitHub repo to Vercel for automatic deploys on push to `main`.

**Verify after deploy:**
1. `npm run build` passes locally
2. Visit deployed URL — home page loads
3. Grant microphone permission — level meter responds
4. Run calibration flow end-to-end
5. Test Learn Mode with actual harmonica
6. Verify `/worklets/pitch-processor.js` is accessible (AudioWorklet file)

## Browser compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome 66+ | Full support | Recommended |
| Firefox 76+ | Full support | |
| Safari 14.1+ | Full support | AudioWorklet added in 14.1 |
| Edge 79+ | Full support | Chromium-based |
| Mobile Chrome | Partial | Higher latency, mic works |
| Mobile Safari | Partial | Requires user gesture for mic |
| IE / Legacy Edge | Not supported | No AudioWorklet |

## Microphone permissions

- **HTTPS required** — browsers only allow `getUserMedia` on secure origins. `localhost` is treated as secure for development.
- **No audio is recorded or transmitted.** All processing happens locally in your browser.
- If you denied mic access, reset it: click the lock/site-info icon in the address bar → Microphone → Allow.

## Known limitations

1. **Browser mode cannot control other apps** — DOM keyboard events stay within the page. Native control requires the Tauri desktop build.
2. **~46ms detection latency** — inherent to 2048-sample analysis buffer at 44.1kHz. Fast enough for control, noticeable for music.
3. **Background tab throttling** — browsers throttle timers in background tabs. Keep the control page in the foreground.
4. **Single microphone** — one audio input at a time.
5. **No cross-device sync** — calibration and settings are in localStorage (per-browser, per-device).
6. **Diatonic harmonicas only** — Richter tuning assumed. Chromatic and tremolo harmonicas are not supported.

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| No sound detected | Mic permission denied | Click lock icon in URL bar → allow microphone |
| Level meter flat at 0 | Wrong input device | Check OS audio input settings |
| Pitch display blank | Playing too softly | Play closer to mic; check debug page for amplitude |
| Wrong notes detected | Not calibrated for your harmonica | Run calibration at `/calibrate` |
| Notes flicker between values | Breath transitions | Normal — stability filter needs 4 consistent frames |
| White screen / crash | JavaScript error | Refresh; error boundary should catch most crashes |
| Desktop mode unavailable | Running in browser | Requires Tauri build with Rust toolchain |
| Build fails with Tauri imports | `@tauri-apps/api` not installed | Expected — dynamic imports prevent this in web builds |

## Architecture decisions

See [docs/decisions.md](docs/decisions.md) for rationale on YIN vs FFT, AudioWorklet vs ScriptProcessorNode, Tauri vs Electron, and more.

## Other docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — system design overview
- [USER-GUIDE.md](USER-GUIDE.md) — how to use the app
- [BETA-TEST.md](BETA-TEST.md) — manual test cases
- [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md) — deploy checklist

## License

MIT

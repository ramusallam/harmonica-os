# HarmonicaOS

An assistive technology that turns harmonica playing into computer control — and teaches you harmonica along the way.

## How it works

1. Select the key of your diatonic harmonica
2. The app listens to your microphone in real time
3. It detects which note you're playing using pitch detection (YIN algorithm)
4. Three scale degrees map to keyboard commands:

| Play | Degree | Command |
|------|--------|---------|
| Root | 1 | Right Arrow |
| Fourth | 4 | Spacebar |
| Fifth | 5 | Left Arrow |

## Quickstart

```bash
# Clone
git clone https://github.com/ramusallam/harmonica-os.git
cd harmonica-os

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

## Project structure

```
harmonica-os/
├── apps/
│   ├── web/              # Next.js web app (deployed on Vercel)
│   └── desktop/          # Tauri desktop app (future)
├── packages/
│   ├── core/             # Framework-agnostic pitch/command logic
│   └── ui/               # Shared React components
└── docs/                 # Architecture decisions
```

### Web app structure (`apps/web/src/`)

```
src/
├── app/                  # Next.js pages
│   ├── page.tsx          # Home — onboarding steps
│   ├── setup/            # Microphone setup
│   ├── select/           # Harmonica key selection
│   ├── calibrate/        # Calibration wizard
│   ├── learn/            # Learn mode — practice notes
│   ├── control/          # Control mode — fire commands
│   ├── settings/         # All configuration
│   └── debug/            # Diagnostics panel
├── components/
│   ├── layout/           # Nav, shell
│   ├── audio/            # Level meter
│   ├── harmonica/        # Key selector, pitch display, command log
│   └── shared/           # Button, card, status badge
├── hooks/                # React hooks (audio engine, pitch detector, settings)
├── lib/
│   ├── audio/            # Microphone capture, AudioWorklet engine
│   ├── pitch/            # YIN algorithm, smoother, detector
│   ├── commands/         # Command state machine, gate, dispatcher
│   ├── calibration/      # Sample collection, frequency-window matcher
│   ├── learn/            # Lesson engine
│   ├── storage/          # localStorage persistence
│   └── accessibility/    # Screen reader helpers
└── types/                # TypeScript interfaces
```

## Two modes

**Learn Mode** — Prompts you to play degrees 1, 4, and 5. Provides instant feedback (correct/wrong, confidence, corrective hints). Tracks hits, streak, and accuracy. Sequential or random drill order.

**Control Mode** — Maps detected notes to keyboard commands via a 5-phase state machine (idle → candidate → confirmed → cooldown → idle). Three execution modes:
- **Learn Only** — detection runs, no commands fired
- **Browser Demo** — fires DOM keyboard events in-page only
- **Desktop Control** — placeholder for Tauri native key injection

## Tech stack

- **Next.js 15** + React 19 + TypeScript (strict) + Tailwind CSS v4
- **Web Audio API** — AudioWorklet for real-time mic processing on a separate thread
- **YIN algorithm** — monophonic pitch detection tuned for harmonica
- **Calibration** — per-key profiles with personalized frequency tolerance windows
- **No backend** — everything runs client-side in the browser
- **Tauri** (planned) — desktop wrapper with native key injection

## Requirements

- Node.js 18+
- npm 9+
- A microphone
- A diatonic harmonica (any key)

## Browser compatibility

| Browser | Supported | Notes |
|---------|-----------|-------|
| Chrome 66+ | Yes | Full AudioWorklet support |
| Firefox 76+ | Yes | Full AudioWorklet support |
| Safari 14.1+ | Yes | AudioWorklet support added in 14.1 |
| Edge 79+ | Yes | Chromium-based, same as Chrome |
| Mobile Chrome | Partial | Mic works but may have latency |
| Mobile Safari | Partial | getUserMedia requires user gesture |
| IE / Legacy Edge | No | No AudioWorklet support |

## Microphone permissions

This app requires microphone access to function. Here's what you need to know:

**HTTPS required** — Browsers only allow `getUserMedia` on secure origins. Vercel serves HTTPS by default. For local development, `localhost` is treated as secure.

**Permission prompt** — The browser will ask for microphone permission when you click "Connect Microphone" on the setup or calibration page. You must allow it.

**Revoking permission** — If you previously denied mic access:
- Chrome: Click the lock icon in the address bar → Site Settings → Microphone → Allow
- Firefox: Click the lock icon → Connection Secure → More Information → Permissions
- Safari: Safari → Settings for This Website → Microphone → Allow

**No audio is recorded or transmitted.** All processing happens in your browser. No audio data leaves your device.

## Scripts

```bash
npm run dev       # Start web dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
```

## Deployment

### Vercel (recommended)

The app is configured for Vercel deployment via `vercel.json`. No environment variables are needed.

**First-time setup:**

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Link project
vercel link

# Deploy to production
npx vercel --prod --yes
```

**Subsequent deploys:**

```bash
npx vercel --prod --yes
```

Or push to `main` with Vercel Git Integration enabled for automatic deploys.

### Git setup (if starting fresh)

```bash
git init
git add -A
git commit -m "Initial commit"
git remote add origin https://github.com/ramusallam/harmonica-os.git
git push -u origin main
```

### Deployment checklist

- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes
- [ ] No `.env` files committed (verify with `git status`)
- [ ] `vercel.json` present with correct monorepo config
- [ ] Test microphone access works on deployed URL (HTTPS)
- [ ] Test in Chrome and at least one other browser
- [ ] Verify AudioWorklet loads (`/worklets/pitch-processor.js` accessible)
- [ ] Test calibration flow end-to-end
- [ ] Test Learn Mode with actual harmonica
- [ ] Test Control Mode in Browser Demo mode

## Known limitations (browser-only version)

1. **No OS-level key injection** — Browser Demo mode fires DOM `KeyboardEvent`s that only work within the page. They cannot control other applications or the OS. This requires the Tauri desktop app (Phase 5).

2. **AudioWorklet latency** — The Web Audio API processes audio in 128-sample chunks. With a 2048-sample analysis buffer at 44.1kHz, there's ~46ms of inherent latency before pitch is detected. This is fast enough for control but noticeable for real-time musical feedback.

3. **Background tab throttling** — Browsers throttle `requestAnimationFrame` and timers in background tabs. If you switch to another tab, detection will slow or stop. The control page must remain in the foreground.

4. **Mobile limitations** — Mobile browsers may have higher audio latency, require explicit user gestures for mic access, and may suspend audio contexts when the app is backgrounded.

5. **Single microphone** — The app uses one audio input at a time. You can switch devices on the setup page, but you cannot use multiple mics simultaneously.

6. **No persistence across devices** — Calibration profiles and settings are stored in `localStorage`, which is per-browser and per-device. They don't sync across devices.

7. **Harmonica type** — Designed for standard diatonic (Richter-tuned) harmonicas. Chromatic harmonicas, tremolo harmonicas, or other tuning systems are not supported.

## Architecture decisions

See [docs/decisions.md](docs/decisions.md) for detailed rationale on:
- YIN over FFT for pitch detection
- AudioWorklet over ScriptProcessorNode
- Tauri over Electron for desktop
- Client-side only (no backend)
- Silence-gap debounce over fixed cooldown

## License

MIT

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
│   ├── web/              # Next.js web app (Vercel)
│   └── desktop/          # Tauri desktop app (future)
├── packages/
│   ├── core/             # Framework-agnostic logic
│   └── ui/               # Shared React components
└── docs/                 # Architecture docs
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
│   ├── audio/            # Level meter, waveform
│   ├── harmonica/        # Key selector, pitch display, command log
│   └── shared/           # Button, card, status badge
├── hooks/                # React hooks
├── lib/
│   ├── audio/            # Microphone capture, AudioWorklet
│   ├── pitch/            # YIN algorithm, pitch detector
│   ├── commands/         # Gate logic, command engine
│   ├── calibration/      # Calibration wizard logic
│   ├── storage/          # localStorage persistence
│   └── accessibility/    # Screen reader, focus management
└── types/                # TypeScript interfaces
```

## Two modes

**Learn Mode** — Visual tuner and note trainer. Shows what you're playing, how close you are to the target, and tracks your accuracy.

**Control Mode** — Fires keyboard commands from detected notes. Web version dispatches events in-page. Desktop version (Tauri) injects OS-level keystrokes.

## Tech stack

- **Next.js 15** + TypeScript + Tailwind CSS v4
- **Web Audio API** — AudioWorklet for real-time mic processing
- **YIN algorithm** — monophonic pitch detection tuned for harmonica
- **Tauri** (planned) — desktop wrapper with native key injection
- **No backend** — everything runs client-side

## Requirements

- Node.js 18+
- npm 9+
- A microphone
- A diatonic harmonica (any key)
- Chrome, Firefox, or Safari 14.1+ (AudioWorklet required)

## Scripts

```bash
npm run dev       # Start web dev server
npm run build     # Production build
npm run lint      # ESLint
```

## Deployment

Web app deploys to Vercel. Push to `main` or run:

```bash
npx vercel --prod --yes
```

## License

MIT

# HarmonicaOS — Architecture

System overview for someone returning to this codebase after time away.

## One-sentence summary

Microphone audio → AudioWorklet → YIN pitch detection → smoothing pipeline → calibration matcher → state machine → command dispatch.

## The pipeline

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Microphone  │───▶│  AudioWorklet │───▶│  YIN (pitch) │───▶│  Smoother    │
│  (getUserMedia)│   │  (off-thread) │    │  (frequency)  │    │  (stability)  │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                                                                  │
                                              ┌───────────────────┘
                                              ▼
                                    ┌──────────────────┐    ┌───────────────┐
                                    │  CalibrationMatcher │───▶│  State Machine │
                                    │  (degree mapping)    │    │  (command gate) │
                                    └──────────────────┘    └───────────────┘
                                                                  │
                                              ┌───────────────────┘
                                              ▼
                                    ┌───────────────────┐
                                    │  CommandDispatcher  │
                                    │  (NoOp/Web/Tauri)   │
                                    └───────────────────┘
```

Each stage is independently testable. No stage knows about the stages before or after it.

## Stage details

### 1. Microphone capture (`lib/audio/`)

- `getUserMedia` acquires the mic stream
- Routed through an `AudioWorkletNode` that runs on the audio thread
- The worklet posts raw `Float32Array` buffers to the main thread via `MessagePort`
- Buffer size: 2048 samples at 44.1kHz (~46ms per frame)

**Key file:** `apps/web/src/lib/audio/audio-engine.ts`
**Worklet file:** `apps/web/public/worklets/pitch-processor.js`

### 2. YIN pitch detection (`lib/pitch/yin.ts`)

- Implements the YIN autocorrelation algorithm (de Cheveigné & Kawahara, 2002)
- Four steps: difference function → cumulative mean normalized difference → absolute threshold → parabolic interpolation
- Returns `{ frequency, confidence }` or `null` if no clear pitch
- Frequency band: 100–2500 Hz (covers all diatonic harmonica notes)
- Confidence threshold: 0.15 (tuned for harmonica timbre)

### 3. Smoothing pipeline (`lib/pitch/smoother.ts`)

Five stages, in order:

1. **Amplitude gate** — reject frames below noise floor (prevents detection from quiet noise)
2. **Confidence gate** — reject frames with YIN confidence below threshold
3. **Median-of-5 filter** — takes median of last 5 frequency readings (removes outlier spikes)
4. **Exponential smoothing** — `output = α × new + (1-α) × previous` with α=0.3 (reduces jitter)
5. **Stability state machine** — requires 4 consecutive frames within ±50 cents to declare "stable"

The output is a `PitchState`: `{ currentPitch: number | null, isStable: boolean, confidence: number }`.

### 4. Calibration matcher (`lib/calibration/matcher.ts`)

- Loaded with a `CalibrationProfile` (either user-calibrated or default)
- Each profile stores per-degree data: center frequency, tolerance window (in cents), frequency range
- `match(frequency)` returns `{ degree, confidence, centsFromCenter }` or null
- **Octave folding:** collapses input frequency into the same octave as the calibrated frequency (±2 octaves). A C4 and C5 both match degree 1.

### 5. Command state machine (`lib/commands/state-machine.ts`)

Five phases:

```
idle → listening → candidate → confirmed → cooldown → idle
```

- **idle:** no note detected
- **listening:** note detected, building initial confidence
- **candidate:** note identified, hold-to-confirm countdown (4 frames, ~180ms)
- **confirmed:** command fires, display hold for visual feedback
- **cooldown:** brief lockout (300ms) to prevent double-fires

The state machine does not know what command to fire — it just says "degree X confirmed." The dispatcher handles execution.

### 6. Command dispatcher (`packages/core/src/commands/dispatcher.ts`)

Interface with three implementations:

- **NoOpDispatcher** — logs but does nothing. Used in Learn Only mode.
- **WebDispatcher** — fires `new KeyboardEvent('keydown', ...)` on `document`. Used in Browser Demo mode. Events stay within the page.
- **TauriDispatcher** — calls Tauri IPC `invoke('inject_key', ...)` which triggers Rust-side `enigo` keypress. Used in Desktop Control mode.

### 7. Tauri desktop layer (`apps/desktop/src-tauri/`)

Rust backend with safety controls:

- **Armed state** (`Mutex<bool>`) — must be explicitly armed before keys fire
- **Rate limiting** — minimum 200ms between keypresses
- **Fire counter** — tracks total keypresses for auditing
- IPC commands: `inject_key`, `set_armed`, `is_armed`, `get_fire_count`, `reset_fire_count`

The web app detects Tauri at runtime via `window.__TAURI_INTERNALS__` and dynamically imports `@tauri-apps/api/core` to avoid bundling it in web builds.

## Calibration system (`lib/calibration/`)

### Flow

1. **NoiseFloorMeasurer** — collects ~60 RMS readings during silence, computes mean + 3σ as amplitude threshold
2. **SampleCollector** — collects 8 pitch samples per degree, validates each against expected frequency (±200 cents), computes center frequency and standard deviation
3. **buildCalibrationProfile()** — combines noise floor + 3 degree samples into a `CalibrationProfile`
4. **buildDefaultProfile()** — uses textbook equal-temperament frequencies when no calibration exists

### Storage

Profiles are saved to localStorage keyed by harmonica key (e.g., `calibration-C`, `calibration-G`). Loaded on page mount.

## Learn mode (`lib/learn/lesson-engine.ts`)

- **LessonEngine** manages a queue of prompts (degree 1, 4, 5)
- Two modes: `sequential` (cycles in order) and `random` (shuffled)
- Each prompt has 4 states: `waiting → listening → correct | wrong`
- **Hold-to-confirm:** 3 consecutive matching frames required before marking correct
- **Timeout:** prompt marked wrong after configurable timeout if no correct match
- **Stats:** hits, misses, streak, bestStreak, attempts

## Monorepo structure

```
harmonica-os/
├── apps/web/         # Next.js 15 + React 19 — the main application
├── apps/desktop/     # Tauri 2 — native desktop wrapper
├── packages/core/    # Pure TypeScript — no DOM, no React
└── packages/ui/      # Shared React components
```

npm workspaces. `packages/core` is imported by both `apps/web` and `apps/desktop`. The rule: if it has no browser dependency, it belongs in `packages/core`.

## Key design decisions

Documented in detail in [docs/decisions.md](docs/decisions.md):

- **YIN over FFT** — handles harmonica overtones correctly
- **AudioWorklet over ScriptProcessorNode** — off-thread, not deprecated
- **Tauri over Electron** — 5MB binary vs 150MB, Rust for key injection
- **Pitch class matching** — octave-agnostic, C4 and C5 both count as "the 1"
- **No backend** — everything runs client-side, static Next.js build
- **Silence-gap debounce** — mirrors how harmonicas are actually played
- **Dark mode first** — standard for music/audio software

## Technology

| Layer | Tech | Why |
|-------|------|-----|
| Framework | Next.js 15, React 19 | App Router, static export |
| Language | TypeScript (strict) | Type safety across the pipeline |
| Styling | Tailwind CSS v4 | Utility-first, dark mode |
| Audio | Web Audio API, AudioWorklet | Real-time, off-thread |
| Pitch detection | YIN algorithm | Monophonic fundamental, handles overtones |
| Desktop | Tauri 2, Rust | Lightweight, native key injection |
| Key injection | enigo (Rust crate) | Cross-platform OS-level keypresses |
| Deployment | Vercel | Static hosting, HTTPS, CDN |
| Storage | localStorage | Client-side, no backend needed |

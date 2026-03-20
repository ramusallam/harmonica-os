# Architectural Decisions

## D1: YIN over FFT for pitch detection

**Date:** 2026-03-20
**Status:** Accepted

Harmonicas produce strong overtones. FFT peak-picking often locks onto the 2nd
harmonic instead of the fundamental. YIN is a monophonic fundamental frequency
detector that handles this correctly with ~200 lines of code and negligible CPU
cost.

**Tradeoff:** YIN is marginally slower than a single FFT pass, but the
difference is microseconds at our buffer size.

## D2: AudioWorklet over ScriptProcessorNode

**Date:** 2026-03-20
**Status:** Accepted

ScriptProcessorNode runs on the main thread and is deprecated.
AudioWorklet runs on a dedicated audio thread, preventing UI jank.
Supported in Chrome 66+, Firefox 76+, Safari 14.1+.

**Tradeoff:** More complex setup (separate file, message passing). Worth it for
guaranteed real-time performance.

## D3: Tauri over Electron for desktop

**Date:** 2026-03-20
**Status:** Accepted

The only native requirement is OS-level key injection — a few dozen lines of
platform-specific code. Tauri uses the OS native webview (~5MB binary) vs
Electron's bundled Chromium (~150MB). Rust is the right tool for the native
key injection bridge.

**Tradeoff:** Younger ecosystem, but our native surface area is tiny.

## D4: Monorepo with packages/core separation

**Date:** 2026-03-20
**Status:** Accepted

Core pitch detection, harmonica theory, and command mapping logic has zero
React or DOM dependencies. Both `apps/web` and `apps/desktop` import it
directly. Makes unit testing trivial and prevents future extraction pain.

## D5: Pitch class matching, not exact frequency

**Date:** 2026-03-20
**Status:** Accepted

We collapse detected frequencies into pitch classes (C, C#, D...) regardless
of octave before checking against target degrees. A user might play C4 or C5
— both are "the 1." Simpler and more robust.

**Tradeoff:** Cannot distinguish octaves. Not needed for command mapping.

## D6: No backend

**Date:** 2026-03-20
**Status:** Accepted

All processing is local. User preferences go in localStorage. The web app
is a static Next.js build. Nothing to store server-side.

**Tradeoff:** No cross-device sync, no analytics. Neither needed.

## D7: Silence-gap debounce over fixed cooldown

**Date:** 2026-03-20
**Status:** Accepted

A new command fires only after silence (amplitude below threshold for >100ms)
followed by a sustained note (>150ms). This mirrors how harmonicas are
actually played — you stop airflow between notes. Allows rapid sequential
commands while preventing retrigger on held notes.

**Tradeoff:** Requires tuning thresholds per environment. Exposed in settings.

## D8: Dark mode first, CSS custom properties

**Date:** 2026-03-20
**Status:** Accepted

Dark backgrounds are standard for music/audio software and reduce eye strain
during extended use. CSS custom properties (not Tailwind theme) for color
tokens — keeps the palette explicit and overridable for high-contrast mode.

## D9: lib/ in web app vs packages/core split

**Date:** 2026-03-20
**Status:** Accepted

`packages/core` holds pure, framework-agnostic TypeScript (pitch detection
algorithm, note math, command mapping). `apps/web/src/lib/` holds
browser-specific implementations (getUserMedia, AudioWorklet, localStorage)
and React hooks that wire core logic into the UI.

The rule: if it has no browser or React dependency, it goes in packages/core.
If it touches the DOM, Web APIs, or React, it goes in lib/.

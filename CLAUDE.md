# HarmonicaOS — Claude Code Instructions

## Project Overview

HarmonicaOS is an assistive technology web app that lets users control a computer with harmonica playing through the microphone. It also teaches harmonica note recognition.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS v4 + Vercel (web) + Tauri (desktop)
**No backend.** Everything runs client-side.

## Architecture

- **Monorepo** with npm workspaces: `apps/web`, `apps/desktop`, `packages/core`, `packages/ui`
- **packages/core** — framework-agnostic TypeScript. Pitch detection, harmonica tuning, command mapping. Zero React/DOM dependencies.
- **packages/ui** — shared React components (key selector, pitch display, visualizer)
- **apps/web** — Next.js shell, deployed to Vercel
- **apps/desktop** — Tauri wrapper, adds OS-level key injection via Rust IPC

## Audio Pipeline

```
Mic → getUserMedia → AudioContext → AudioWorklet (ring buffer)
  → YIN autocorrelation → frequency (Hz)
  → snap to nearest note → classify scale degree
  → if 1, 4, or 5 → fire command via dispatcher
```

## Coding Conventions

- **TypeScript** strict mode everywhere. No `any`.
- **Named exports** only. No default exports except Next.js pages/layouts.
- **File naming:** `kebab-case.ts` for files, `PascalCase` for components.
- **Tailwind CSS v4** for styling. No CSS modules.
- **Dark mode first.** Use CSS custom properties from globals.css.

## Command Mapping (MVP)

| Scale Degree | Keyboard Action |
|---|---|
| 1 (root) | Right Arrow |
| 4 (fourth) | Spacebar |
| 5 (fifth) | Left Arrow |

## Key Decisions

- **YIN over FFT** for pitch detection (harmonicas have strong overtones)
- **AudioWorklet over ScriptProcessorNode** (off-main-thread processing)
- **Tauri over Electron** for desktop (tiny native surface, smaller binary)
- **Pitch class matching** — collapse octaves, only care about note name

## What NOT to Do

- Do not add a backend/database unless absolutely unavoidable
- Do not use ML-based pitch detection for MVP (CREPE is overkill)
- Do not try OS-level key injection from the browser — it's impossible
- Do not install packages without checking if the Web Audio API already covers the need
- Do not create README files unless explicitly asked

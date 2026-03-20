# HarmonicaOS — Roadmap

## Phase 1: Pitch Detection MVP
- [ ] Wire microphone capture into AudioWorklet pipeline
- [ ] Run YIN pitch detection on AudioWorklet output buffers
- [ ] Display detected note, octave, cents offset in real time
- [ ] Show live audio level meter on setup and learn pages
- [ ] Verify detection accuracy with a real harmonica across multiple keys
- [ ] Handle AudioWorklet loading (copy processor file to public/, register)

## Phase 2: Command Pipeline
- [ ] Wire gate logic into pitch stream (silence gap, min duration, cents threshold)
- [ ] Connect degree mapper → command mapper → web dispatcher end-to-end
- [ ] Show fired commands in CommandLog component
- [ ] Test: play 1/4/5 on harmonica → see Right/Space/Left in log
- [ ] Add keyboard event listener on Control page to prove commands land
- [ ] Tune default gate parameters with real harmonica testing

## Phase 3: Calibration
- [ ] Record noise floor during silence step
- [ ] Collect frequency samples during play-root/fourth/fifth steps
- [ ] Compute per-degree average frequency and amplitude threshold
- [ ] Save calibration result to localStorage
- [ ] Load calibration on startup and feed into gate config
- [ ] Show calibration freshness on debug page

## Phase 4: Learn Mode
- [ ] Wire real-time pitch into PitchDisplay on learn page
- [ ] Implement accuracy meter (cents distance from target, color-coded)
- [ ] Auto-advance target when user hits correct note
- [ ] Track hits, streak, and accuracy percentage
- [ ] Add drill sequence modes (sequential, random)
- [ ] Add visual/audio feedback on successful hit

## Phase 5: Desktop (Tauri)
- [ ] Initialize Tauri project in apps/desktop
- [ ] Implement keypress.rs — OS-level key injection (macOS CGEvent)
- [ ] Create Tauri IPC command bridge
- [ ] Build TauriDispatcher in packages/core
- [ ] Add runtime environment detection (web vs Tauri)
- [ ] Test: harmonica → advance slides in Keynote/PowerPoint
- [ ] Windows key injection (SendInput)
- [ ] Linux key injection (XTest)

## Phase 6: Polish
- [ ] Onboarding flow for first-time users
- [ ] Settings persistence validation (handle schema changes across versions)
- [ ] Audio visualizer (waveform or simple spectrogram)
- [ ] Custom command mapping UI (remap any degree to any key)
- [ ] Mobile detection + graceful degradation message
- [ ] Full accessibility audit (screen reader, keyboard nav, WCAG 2.1 AA)
- [ ] High contrast theme implementation
- [ ] Desktop installer builds (.dmg, .msi)

## Someday / Maybe
- [ ] CREPE ML model as optional "precision mode" pitch detector
- [ ] Multi-note chord detection for expanded command set
- [ ] MIDI output mode
- [ ] Macro sequences (e.g., play 1-5-1 → trigger a multi-key shortcut)
- [ ] User profiles with cloud sync
- [ ] Voice command hybrid (harmonica + voice)

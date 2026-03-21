# HarmonicaOS — Beta Test Cases

Manual test checklist. Run through these before any release. You need a diatonic harmonica and a working microphone.

## Environment

- **Browser:** Chrome (primary), plus one of Firefox / Safari / Edge
- **URL:** https://harmonica-os.vercel.app or `localhost:3000`
- **Hardware:** laptop/desktop mic or USB mic, diatonic harmonica (any key)

---

## T1: App loads

| # | Step | Expected |
|---|------|----------|
| 1.1 | Open the app URL | Home page loads, nav bar visible |
| 1.2 | Click each nav link | All pages render without errors: Calibrate, Learn, Control, Settings, Debug |
| 1.3 | Check browser console | No errors on initial load |

## T2: Microphone connection

| # | Step | Expected |
|---|------|----------|
| 2.1 | Go to `/calibrate`, click "Connect Microphone" | Browser prompts for mic permission |
| 2.2 | Grant permission | Level meter appears and responds to ambient sound |
| 2.3 | Speak or clap near mic | Level meter spikes; dBFS shows a value |
| 2.4 | Click "Disconnect" | Level meter drops to zero, mic indicator disappears |

## T3: Microphone denied

| # | Step | Expected |
|---|------|----------|
| 3.1 | Deny mic permission when prompted | No crash; app shows appropriate state (no level meter activity) |
| 3.2 | Navigate to another page and back | App still functional, can retry mic connection |

## T4: Calibration — full flow

| # | Step | Expected |
|---|------|----------|
| 4.1 | Go to `/calibrate` | Step 1 of N shown, key selector visible |
| 4.2 | Select your harmonica key, click "Continue" | Advances to mic check step |
| 4.3 | Connect mic, click "Mic sounds good" | Advances to noise floor step |
| 4.4 | Stay silent for ~3 seconds | Noise floor progress bar fills to 100%, auto-advances |
| 4.5 | Play degree 1 (root) steadily | Sample counter increments, progress bar fills. Shows "Degree 1 captured" with frequency stats |
| 4.6 | Click "Next", play degree 4 | Same collection behavior for degree 4 |
| 4.7 | Click "Next", play degree 5 | Same collection behavior for degree 5 |
| 4.8 | Review screen | Shows all 3 degrees with center frequency, tolerance, sample count |
| 4.9 | Click "Save Calibration" | Shows "Complete" screen with links to Learn and Control |

## T5: Calibration — retry and skip

| # | Step | Expected |
|---|------|----------|
| 5.1 | During any play step, click "Retry this note" | Progress resets to 0 for that degree, collection restarts |
| 5.2 | On step 1 (select-key), click "Skip calibration" | Saves default profile, jumps to Complete screen |
| 5.3 | Click "Start over" at any point | Returns to step 1, all progress reset |

## T6: Calibration — persistence

| # | Step | Expected |
|---|------|----------|
| 6.1 | Complete calibration, navigate away | — |
| 6.2 | Return to `/calibrate` | "Calibrated [date]" badge visible on step 1 |
| 6.3 | Go to `/learn` | No "Not calibrated" warning for the calibrated key |
| 6.4 | Change key in Settings to an uncalibrated key | "Not calibrated" warning appears on Learn page |

## T7: Learn Mode — basic flow

| # | Step | Expected |
|---|------|----------|
| 7.1 | Go to `/learn`, click "Start Practice" | Mic starts, target note appears in circle |
| 7.2 | Play the displayed note correctly | Green "Correct" text, feedback message, auto-advances to next note |
| 7.3 | Play a wrong note | Red "Heard degree X" text, feedback with correction, auto-advances |
| 7.4 | Do nothing (don't play) | "Play when ready..." then "Listening..." — no crash, no timeout panic |
| 7.5 | Check stats panel | Hits, streak, best streak, accuracy % update correctly |
| 7.6 | Click "Stop" | Session ends, prompt clears, mic stops |

## T8: Learn Mode — mode switching

| # | Step | Expected |
|---|------|----------|
| 8.1 | Start session in Sequential mode | Prompts cycle: degree 1 → 4 → 5 → 1 → ... |
| 8.2 | Switch dropdown to "Random" | Next prompts are randomly ordered (verify over 6+ prompts) |
| 8.3 | Switch back to "Sequential" | Prompts resume cycling in order |

## T9: Control Mode — learn only

| # | Step | Expected |
|---|------|----------|
| 9.1 | Go to `/control`, verify mode is "Learn Only" | No arm button visible |
| 9.2 | Click "Start Listening" | Mic activates, phase shows "Idle" |
| 9.3 | Play degree 1 | Phase cycles: Listening → Candidate → Confirmed → Cooldown → Idle |
| 9.4 | Verify no keyboard events fired | No visible effect on page; debug log shows detection only |

## T10: Control Mode — browser demo

| # | Step | Expected |
|---|------|----------|
| 10.1 | Switch mode to "Browser Demo" | Arm button appears |
| 10.2 | Start listening, play a note while disarmed | State machine runs but no command fires |
| 10.3 | Click "Arm" | Armed banner/indicator appears |
| 10.4 | Play degree 1 | "ArrowRight" fires — check debug log or console |
| 10.5 | Play degree 4 | "Space" fires |
| 10.6 | Play degree 5 | "ArrowLeft" fires |
| 10.7 | Press Escape | Emergency stop: disarms, stops mic |

## T11: Control Mode — rapid notes

| # | Step | Expected |
|---|------|----------|
| 11.1 | Arm in Browser Demo mode | — |
| 11.2 | Play two different notes rapidly (< 500ms apart) | Only one command fires per confirmed note; cooldown prevents double-fire |
| 11.3 | Hold a single note for 5+ seconds | Only one command fires (not repeated) |

## T12: Settings

| # | Step | Expected |
|---|------|----------|
| 12.1 | Go to `/settings` | Current harmonica key shown |
| 12.2 | Change key to a different value | Setting saves immediately |
| 12.3 | Go to `/learn` | Key of [new key] shown in description and reference card |
| 12.4 | Refresh the page | Setting persists (localStorage) |

## T13: Debug page

| # | Step | Expected |
|---|------|----------|
| 13.1 | Go to `/debug` | Page renders |
| 13.2 | Connect mic (if not already running) | Frequency, confidence, amplitude values update live |
| 13.3 | Play a note | Detected frequency matches expected note |

## T14: Error recovery

| # | Step | Expected |
|---|------|----------|
| 14.1 | If any page crashes (simulate by corrupting localStorage) | Error boundary shows "Something went wrong" with "Try Again" button |
| 14.2 | Click "Try Again" | Component re-renders without full page reload |

## T15: Cross-browser

| # | Step | Expected |
|---|------|----------|
| 15.1 | Repeat T2 (mic connection) in Firefox or Safari | Mic works, level meter responds |
| 15.2 | Repeat T7 (learn mode basic) in Firefox or Safari | Detection and feedback work correctly |

## T16: Navigation and state

| # | Step | Expected |
|---|------|----------|
| 16.1 | Start a Learn session, navigate to Settings | Mic stops (or continues safely) |
| 16.2 | Navigate back to Learn | Session is not active; can start fresh |
| 16.3 | Start Control mode armed, navigate away | Armed state does not persist across navigations |

---

## Severity guide for bug reports

- **P0 (blocker):** App crashes, mic doesn't work, commands fire when disarmed
- **P1 (high):** Wrong note detection, commands fire incorrectly, calibration data lost
- **P2 (medium):** UI glitch, stats counter wrong, feedback message incorrect
- **P3 (low):** Cosmetic issue, wording, minor layout problem

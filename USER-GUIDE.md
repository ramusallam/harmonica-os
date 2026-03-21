# HarmonicaOS — User Guide

This guide is for someone sitting in front of the app with a harmonica and a microphone.

## First-time setup

### 1. Open the app

Go to https://harmonica-os.vercel.app (or `http://localhost:3000` if running locally).

### 2. Select your harmonica key

From the home page, click through to the key selection step. Pick the key stamped on your harmonica (e.g., C, G, A). This tells the app which frequencies to expect for each scale degree.

You can change this later in Settings.

### 3. Connect your microphone

Click "Connect Microphone." Your browser will ask for permission — allow it. You should see the level meter respond when you speak or play.

**Tips:**
- Use a decent microphone. Built-in laptop mics work but pick up more noise.
- Play 6–12 inches from the mic.
- Reduce background noise (TV, fans, other people talking).

### 4. Calibrate (recommended)

Go to `/calibrate`. This teaches the app your specific harmonica's frequencies and your playing style.

**Steps:**
1. **Select key** — confirm your harmonica key
2. **Check mic** — verify the level meter is working
3. **Noise floor** — stay silent for ~3 seconds while it measures ambient noise
4. **Play degree 1** — play the root note (blow on hole 4 for most keys). Hold it steady. The app collects 8 samples.
5. **Play degree 4** — play the fourth (blow on hole 6). Same process.
6. **Play degree 5** — play the fifth (draw on hole 4). Same process.
7. **Review** — check the captured frequency ranges. Save.

**If you make a mistake:** click "Retry this note" to redo any degree.

**If you want to skip:** click "Skip (use defaults)" — the app will use textbook frequencies. Calibration makes it more accurate for your specific harmonica and mic.

## Learn Mode

Go to `/learn`. This is where you practice hitting the three target notes.

### How it works

1. Click **Start Practice**
2. A target note appears in the large circle (e.g., "C — Degree 1")
3. Play that note on your harmonica
4. If correct: green "Correct" feedback, auto-advances to next note
5. If wrong: red feedback showing what it heard, auto-advances after a short delay
6. Stats update in real time: hits, streak, best streak, accuracy %

### Mode selector

- **Sequential** — cycles through degrees 1, 4, 5 in order. Good for building muscle memory.
- **Random** — picks a random degree each time. Good for testing recall.

### Tips

- Start with Sequential mode until you can hit each note consistently
- Watch the "What we hear" panel to understand what the mic is picking up
- If accuracy is low, recalibrate — your mic position may have changed
- The note reference card at the bottom shows which notes map to which degrees for your key

## Control Mode

Go to `/control`. This maps detected notes to keyboard commands.

### Three execution modes

**Learn Only** (default, safe) — the state machine runs and shows what *would* fire, but no commands execute. Use this to verify detection accuracy before enabling real commands.

**Browser Demo** — fires DOM `KeyboardEvent`s within the page. Useful for testing with web apps that listen for keyboard input. Commands do not leave the browser tab.

**Desktop Control** — fires real OS-level keypresses via Tauri. Only available in the desktop app (not the web version). Can control any application.

### Armed / disarmed

In Browser Demo and Desktop Control modes, you must explicitly **arm** the system before commands will fire. This prevents accidental keypresses.

- Click the **Arm** button (or toggle) to enable command firing
- The page shows a colored banner when armed
- Press **Escape** at any time for emergency stop (disarms + stops mic)

### State machine phases

The control page shows the current phase:

1. **Idle** — waiting for a note
2. **Listening** — note detected, building confidence
3. **Candidate** — note identified, hold to confirm (4 frames / ~180ms)
4. **Confirmed** — command fires
5. **Cooldown** — brief lockout to prevent double-fires

### Default command mapping

| Degree | Command |
|--------|---------|
| 1 | Right Arrow |
| 4 | Spacebar |
| 5 | Left Arrow |

These are configurable in code but not yet exposed in the UI.

## Settings

Go to `/settings`.

- **Harmonica Key** — change the key your app is tuned to. Changing this resets calibration status for the new key.

## Debug Page

Go to `/debug`. Shows raw audio data:

- Current detected frequency and confidence
- Amplitude levels (RMS, peak, dBFS)
- Pitch stability state
- Useful for troubleshooting detection issues

## Common questions

**Q: Do I need to calibrate every time?**
No. Calibration is saved in your browser's localStorage. It persists until you clear browser data or recalibrate.

**Q: Can I use a chromatic harmonica?**
No. The app assumes Richter (diatonic) tuning. Chromatic harmonicas have different note layouts.

**Q: Why does it detect the wrong note sometimes?**
Usually because of breath transitions (the brief moment between notes) or because your harmonica is slightly out of tune compared to the default profile. Calibrating fixes this.

**Q: Can I use this to control a presentation?**
Yes — that's the primary use case. In browser mode, open your presentation in an iframe or use Browser Demo mode. In desktop mode (Tauri), it can control any app including Keynote, PowerPoint, or Google Slides.

**Q: Does it record my audio?**
No. All audio processing happens locally in your browser. Nothing is sent to any server.

**Q: What if I play a note that isn't degree 1, 4, or 5?**
The app ignores it. Only the three calibrated degrees trigger actions.

**Q: Why is there a delay between playing and command firing?**
The pipeline needs ~46ms for audio buffering + ~180ms for hold-to-confirm = ~226ms total. This is intentional — it prevents accidental fires from brief sounds.

# HarmonicaOS — Release Checklist

Use this checklist before every release. Copy it into a new issue or PR description.

## Pre-release

### Build

- [ ] `npm install` completes without errors
- [ ] `npm run build` passes (type checking + lint + compilation)
- [ ] `npm run lint` has no errors
- [ ] No `.env` files or credentials in the repo (`git status`, check `.gitignore`)
- [ ] `vercel.json` present with correct monorepo config (`apps/web` as root)

### Functional (requires harmonica + mic)

- [ ] Home page loads without console errors
- [ ] Mic permission grant works in Chrome
- [ ] Mic permission grant works in at least one other browser (Firefox/Safari/Edge)
- [ ] Level meter responds to ambient sound
- [ ] Calibration flow completes end-to-end (noise floor → 3 degrees → save)
- [ ] Saved calibration persists across page reloads
- [ ] Learn Mode: correct notes show green feedback
- [ ] Learn Mode: wrong notes show red feedback with correction
- [ ] Learn Mode: stats (hits, streak, accuracy) update correctly
- [ ] Learn Mode: sequential and random modes both work
- [ ] Control Mode: Learn Only shows state machine phases without firing commands
- [ ] Control Mode: Browser Demo fires DOM events when armed
- [ ] Control Mode: Escape key triggers emergency stop
- [ ] Settings: key change persists and affects detection
- [ ] Debug page shows live frequency + amplitude data

### Audio pipeline

- [ ] AudioWorklet loads (`/worklets/pitch-processor.js` accessible on deployed URL)
- [ ] No "AudioWorklet not supported" errors in console
- [ ] Pitch detection responds within ~250ms of playing a note
- [ ] Holding a note steady shows "stable" state (not flickering)

### Safety

- [ ] Commands do NOT fire when disarmed
- [ ] Escape key works as emergency stop from any state
- [ ] Navigating away from Control page stops the mic
- [ ] No commands fire in Learn Only mode regardless of input

### Error handling

- [ ] Error boundary catches component crashes (test by corrupting localStorage, then loading a page that reads it)
- [ ] "Try Again" button in error boundary recovers without full page reload
- [ ] Denying mic permission does not crash the app

## Deploy

```bash
# Commit and push
git add -A
git commit -m "release: vX.Y.Z — [brief description]"
git push origin main

# Deploy to Vercel
npx vercel --prod --yes
```

## Post-deploy verification

- [ ] Production URL loads (https://harmonica-os.vercel.app)
- [ ] Mic permission works on production (HTTPS required)
- [ ] Run through calibration once on production
- [ ] Play one Learn Mode session on production
- [ ] Check browser console for errors on production

## If something breaks

1. **Rollback:** `npx vercel rollback` to revert to previous deployment
2. **Diagnose:** Check Vercel deployment logs, browser console, and network tab
3. **Common issues:**
   - AudioWorklet file not found → check `public/worklets/` is included in build
   - CORS errors → check Vercel headers config
   - Blank page → check for build-time errors in Vercel dashboard
   - Mic not working → HTTPS is required (not HTTP)

## Version numbering

Use semantic versioning:

- **Patch (0.1.x):** bug fixes, guard additions, copy changes
- **Minor (0.x.0):** new features (e.g., new control modes, expanded lesson content)
- **Major (x.0.0):** breaking changes (e.g., new calibration format that invalidates saved profiles)

Current version: **0.1.0** (beta)

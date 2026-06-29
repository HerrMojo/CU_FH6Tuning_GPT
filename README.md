# FH6GPT Tune Lab

A static browser-based Forza Horizon tuning calculator for grip, drift, and drag builds across pavement, mixed, and offroad surfaces.

## What it does

- Generates game-facing recommendations for:
  - Tire pressure
  - Gearing
  - Alignment
  - Anti-roll bars
  - Springs and ride height
  - Damping
  - Aero
  - Brakes
  - Differential
- Supports D through X class scaling.
- Supports FWD, RWD, and AWD drivetrains.
- Supports front, mid, and rear engine layout assumptions.
- Supports body type, suspension type, tire compound, torque, horsepower, weight, and front weight percentage inputs.
- Adds a handling-bias selector: Stable / Neutral / More rotation.
- Supports separate front and rear aero availability.
- Includes a phase-based diagnostic system for braking, turn-in, mid-corner, exit, bump, and gearing problems.
- Saves tunes locally in the browser.
- Exports tune JSON.
- Copies a readable tune summary to the clipboard.
- Includes a cyberpunk neon theme using `#2CFF05`, `#FFC4FB`, `#51158C`, and `#00F0FF`.

## Notes on values

The app displays main values in Forza-style units:

- Anti-roll bars: 0 to 100 style setting
- Springs: lb/in
- Ride height: inches, front and rear
- Damping: 1 to 20, front/rear rebound and bump
- Differential: percentages
- Tire pressure: PSI

The app still stores some internal normalized ratios for calculation and JSON export, but the visible tune cards prioritize game-facing values.

## Running locally

Open `index.html` directly in a browser, or run a simple local server:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Publishing

This project is static HTML/CSS/JavaScript. It can be published with GitHub Pages by uploading the files to the repository root and enabling Pages from `main / root`.

## Reference-inspired improvements

This build adds reference-inspired ideas without copying any third-party tuning formulas directly:

- More complete 9-tab tuning coverage
- More diagnostic symptom cards
- Torque-influenced differential behavior
- Handling-bias control
- Body type, suspension type, engine location, and aero availability inputs
- Gear redline speed visualization
- Copy-to-clipboard output
- Phase-based tuning workflow notes

All tunes are starting points. Drive, diagnose by phase, change one setting, then retest.

## Font

The app now uses an OpenDyslexic-first font stack:

`OpenDyslexic`, `OpenDyslexicAlta`, `Atkinson Hyperlegible`, then system UI fallbacks.

No font files are bundled in this project. If OpenDyslexic is installed on the device, the browser will use it. Otherwise, the app falls back to a readable system font.

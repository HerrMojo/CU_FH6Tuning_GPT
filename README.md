# Forza Horizon Tune Lab

A browser-based tuning calculator for Forza Horizon builds. It generates starter tunes for:

- Grip, drift, and drag racing
- Pavement, mixed, and offroad surfaces
- Classes D through X
- FWD, RWD, and AWD drivetrains
- Gearboxes from 4 to 10 gears
- Target top speed and redline-based gearing

## How to run

Open `index.html` directly in a browser for the calculator.

For full PWA behavior, including service worker caching, serve the folder from a local web server:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Project structure

```text
index.html           Interface
styles.css           Visual design
presets.js           Class, surface, mode, and default speed data
gearboxEngine.js     Gear ratio and top speed math
tuningEngine.js      Tire, alignment, suspension, diff, aero, and brake logic
storage.js           localStorage save/load helpers
app.js               UI behavior
manifest.json        PWA manifest
service-worker.js    Offline cache
icon.svg             App icon
```

## Notes

Forza does not expose every car's internal physics values, so this app uses starting-point calculations. The main tune output now uses game-facing units wherever possible:

- Anti-roll bars: Forza-style slider values around 1 to 100
- Springs: lb/in estimates based on weight, weight distribution, car class, race mode, and surface
- Ride height: separate front/rear estimates in inches
- Damping: separate front/rear rebound and bump stiffness on Forza's 1 to 20 scale

Aero still uses normalized low/medium/high guidance where the exact in-game min/max changes by car. Refine every generated tune with the troubleshooting buttons and in-game telemetry.

## Theme

This version uses a cyberpunk-inspired neon theme built around these colors: `#2CFF05`, `#FFC4FB`, `#51158C`, and `#00F0FF`.

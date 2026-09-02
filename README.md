# deaf-signal

**Visual and haptic web alerts — no sound.**  
A tiny ESM library for deaf / hard-of-hearing accessibility on the web.

Flash the screen, show a high-contrast banner, vibrate when supported, or combine them — without relying on audio.

## Install

```bash
npm i github:Auriukux/deaf-signal
```

Optional: clone the repo or copy `src/` into your project and import the modules directly.

## Usage

```js
import {
  flashScreen,
  showBanner,
  vibratePattern,
  alertCombo,
  pulseBorder,
  shakeElement,
  contrastFlashColor,
  isVibrateSupported,
} from "deaf-signal";

// Auto contrast flash (white on dark backgrounds)
await flashScreen({ durationMs: 400 });

await showBanner("Important update — check your messages.", {
  level: "warn", // "info" | "warn" | "urgent"
  durationMs: 4000,
});

// Vibrates when supported AND always visual-shakes when shakeFallback is on
// (desktop vibrate often exists but does nothing)
vibratePattern([200, 100, 200], { shakeFallback: true, target: ".card" });

await alertCombo("Urgent alert!", { level: "urgent" });

// Skip / soften motion (also auto-detects prefers-reduced-motion)
await flashScreen({ reduceMotion: true });
await pulseBorder("#focus-target", { reduceMotion: true });
await shakeElement("main", { reduceMotion: true });
```

## API

| Function | Description |
| --- | --- |
| `flashScreen(opts?)` | Full-viewport flash; auto contrast color when `color` omitted (dark → white); skips when `reduceMotion` / `prefers-reduced-motion` |
| `contrastFlashColor(root?)` | Helper: `#ffffff` on dark backgrounds, `#111111` on light |
| `showBanner(message, opts?)` | Top banner with `role="alert"` |
| `vibratePattern(pattern?, opts?)` | Calls `navigator.vibrate` when available; when `shakeFallback` is on (default `true`), **always** runs visual `shakeElement` too (desktop vibrate is often a no-op) |
| `shakeElement(target, opts?)` | Strong CSS / Web Animations shake (`deaf-signal-shake`, ~±16px + rotate); opacity pulse when reduced motion; cleans up after |
| `isVibrateSupported()` | `true` when Vibration API is present |
| `alertCombo(message, opts?)` | Flash + banner + vibrate/shake; urgent flash is always red `#e53935` when `flashColor` omitted (other levels use auto contrast) |
| `pulseBorder(target, opts?)` | Pulse element border; static outline when reduced motion |

`flashScreen`, `pulseBorder`, `shakeElement`, and `alertCombo` accept optional `reduceMotion: boolean`. When omitted, they follow the OS `prefers-reduced-motion: reduce` media query.

### Vibration presets

Named patterns live in `src/presets.js` (also re-exported from the package root):

| Export | Pattern (ms) | Typical use |
| --- | --- | --- |
| `PATTERN_CALL` | `[300, 120, 300, 120, 300]` | Incoming call / ring cue |
| `PATTERN_MESSAGE` | `[100, 80, 100]` | New message / notification |
| `PATTERN_URGENT` | `[200, 80, 200, 80, 200, 80, 500]` | Urgent / alarm |
| `PRESETS` / `getPreset(name)` | map / lookup | `getPreset("call")` |

```js
import { vibratePattern, PATTERN_MESSAGE, getPreset } from "deaf-signal";

vibratePattern(PATTERN_MESSAGE);
vibratePattern(getPreset("urgent"));
```

## Demo

Open `examples/demo.html` in a browser. Prefer a local static server (ESM imports may be blocked from `file://`):

```bash
npx --yes serve .
# or: npm run demo
```

The demo UI has an LT | EN language toggle (choice saved in `localStorage`); the library API is English. With **Reduce motion** enabled, flash and pulse animations are skipped or softened automatically. Desktop browsers often expose Vibration API that does nothing — with `shakeFallback` (default on), visual shake always runs so the cue is visible.

`/` and `/demo` redirect to the demo page via `index.html` / `serve.json`.

## Why

Many web apps still signal only with sound. This package makes it easy to add **sight + touch** cues so alerts are usable without hearing.

## License

MIT © Auriukux

---

## Lietuviškai (trumpai)

`deaf-signal` — maža ESM biblioteka **vizualiems ir haptic (vibracijos / drebėjimo) įspėjimams**.
Tinka prieinamumui kurtiesiems / neprigirdintiems.

Demo: `npm run demo` → `http://localhost:3000` (arba `/demo`). Viršuje — **LT | EN** perjungimas.
Skubus (urgent) flash — raudonas; jei vibracija neveikia (pvz. desktop), veikia vizualus drebėjimas.

# deaf-signal

**Visual and haptic web alerts — no sound.**  
A tiny ESM library for deaf / hard-of-hearing accessibility on the web.

Flash the screen, show a high-contrast banner, vibrate when supported, or combine them — without relying on audio.

## Install

```bash
npm install deaf-signal
```

Or copy `src/` into your project and import the modules directly.

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

// Vibrates when supported; otherwise visual shake
vibratePattern([200, 100, 200], { shakeFallback: true });

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
| `vibratePattern(pattern?, opts?)` | `navigator.vibrate` helper; optional visual `shakeElement` fallback when vibrate is missing (`shakeFallback`, default `true`) |
| `shakeElement(target, opts?)` | CSS transform shake (drebėjimas); opacity pulse when reduced motion; cleans up styles after |
| `isVibrateSupported()` | `true` when Vibration API is present |
| `alertCombo(message, opts?)` | Flash + banner + vibrate (shake fallback; flash uses auto contrast when `flashColor` omitted) |
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

Buttons are labeled in Lithuanian; the library API is English. With **Reduce motion** enabled, flash and pulse animations are skipped or softened automatically. Desktop browsers without Vibration API use visual shake instead.

## Why

Many web apps still signal only with sound. This package makes it easy to add **sight + touch** cues so alerts are usable without hearing.

## License

MIT © Auriukux

---

## Lietuviškai (trumpai)

`deaf-signal` — maża ESM biblioteka **vizualiems ir haptic (vibracijos) ispêjimams be garso**.  
Tinka prieinamumui kurtiesiems / neprigirdintiems. Atidarykite `examples/demo.html` demonstracijai.

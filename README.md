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
  isVibrateSupported,
} from "deaf-signal";

await flashScreen({ color: "#ffeb3b", durationMs: 400 });

await showBanner("Important update — check your messages.", {
  level: "warn", // "info" | "warn" | "urgent"
  durationMs: 4000,
});

if (isVibrateSupported()) {
  vibratePattern([200, 100, 200]);
}

await alertCombo("Urgent alert!", { level: "urgent" });

// Skip / soften motion (also auto-detects prefers-reduced-motion)
await flashScreen({ reduceMotion: true });
await pulseBorder("#focus-target", { reduceMotion: true });
```

## API

| Function | Description |
| --- | --- |
| `flashScreen(opts?)` | Full-viewport color flash; skips when `reduceMotion` / `prefers-reduced-motion` |
| `showBanner(message, opts?)` | Top banner with `role="alert"` |
| `vibratePattern(pattern?)` | `navigator.vibrate` helper (safe fallback) |
| `isVibrateSupported()` | `true` when Vibration API is present |
| `alertCombo(message, opts?)` | Flash + banner + vibrate (flash respects reduced motion) |
| `pulseBorder(target, opts?)` | Pulse element border; static outline when reduced motion |

`flashScreen`, `pulseBorder`, and `alertCombo` accept optional `reduceMotion: boolean`. When omitted, they follow the OS `prefers-reduced-motion: reduce` media query.

## Demo

Open `examples/demo.html` in a browser. Prefer a local static server (ESM imports may be blocked from `file://`):

```bash
npx --yes serve examples
# or: npm run demo
```

Buttons are labeled in Lithuanian; the library API is English. With **Reduce motion** enabled, flash and pulse animations are skipped or softened automatically.

## Why

Many web apps still signal only with sound. This package makes it easy to add **sight + touch** cues so alerts are usable without hearing.

## License

MIT \u00A9 Auriukux

---

## Lietuviškai (trumpai)

`deaf-signal` — maża ESM biblioteka **vizualiems ir haptic (vibracijos) ispêjimams be garso**.  
Tinka prieinamumui kurtiesiems / neprigirdintiems. Atidarykite `examples/demo.html` demonstracijai.

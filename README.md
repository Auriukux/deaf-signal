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
} from "deaf-signal";

await flashScreen({ color: "#ffeb3b", durationMs: 400 });

await showBanner("Important update — check your messages.", {
  level: "warn", // "info" | "warn" | "urgent"
  durationMs: 4000,
});

vibratePattern([200, 100, 200]); // no-op if Vibration API missing

await alertCombo("Urgent alert!", { level: "urgent" });
```

## API

| Function | Description |
| --- | --- |
| `flashScreen(opts?)` | Full-viewport color flash overlay |
| `showBanner(message, opts?)` | Top banner with `role="alert"` |
| `vibratePattern(pattern?)` | `navigator.vibrate` helper (safe fallback) |
| `alertCombo(message, opts?)` | Flash + banner + vibrate together |
| `pulseBorder(target, opts?)` | Pulse an element border to draw attention |

## Demo

Open `examples/demo.html` in a browser (file URL or local static server):

```bash
npx --yes serve examples
```

Buttons are labeled in Lithuanian; the library API is English.

## Why

Many web apps still signal only with sound. This package makes it easy to add **sight + touch** cues so alerts are usable without hearing.

## License

MIT © Auriukux

---

## Lietuviškai (trumpai)

`deaf-signal` — maža ESM biblioteka **vizualiems ir haptic (vibracijos) įspėjimams be garso**.  
Tinka prieinamumui kurtiesiems / neprigirdintiems. Atidarykite `examples/demo.html` demonstracijai.

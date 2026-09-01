# Contributing

Thanks for helping improve **deaf-signal** — visual + haptic alerts with no sound.

## Run the demo

1. Clone the repo and open `examples/demo.html` in a modern browser, **or**
2. From the repo root:

```bash
npx --yes serve examples
```

Then open the printed local URL and try the buttons (flash, banner, vibrate, combo, pulse).

Vibration requires a device/browser that supports the Vibration API (often mobile Chrome / Android). Desktop browsers typically skip vibrate silently.

## Library entry

Import from the package root (ESM):

```js
import { flashScreen, showBanner, vibratePattern, alertCombo, pulseBorder } from "deaf-signal";
```

Or load `../src/index.js` from the demo page as shown in `examples/demo.html`.

## Pull requests

- Keep changes focused and small.
- Prefer accessibility-friendly defaults (`role="alert"`, high contrast).
- Do not add sound-based APIs — this library is intentionally silent.

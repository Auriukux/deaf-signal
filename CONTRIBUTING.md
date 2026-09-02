# Contributing

Thanks for helping improve **deaf-signal** - visual + haptic alerts with no sound.

## Run the demo

Preferred - from the repo root:

```bash
npm run demo
```

Then open **http://localhost:3000** (or `/demo`). `index.html` / `serve.json` redirect to `examples/demo.html`.

Same server without the npm script:

```bash
npx --yes serve .
```

The demo UI has an **LT | EN** language toggle. Vibration: mobile often gets a real vibrate; desktop uses a visual shake fallback when `shakeFallback` is on.

**PowerShell tip:** use `npm run demo` from the clone root (no `&&` needed). If the package is installed as a dependency, see the README for `--prefix` / `cd` options.

## Library entry

Import from the package root (ESM):

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
```

Presets (`PATTERN_*`, `PRESETS`, `getPreset`) are optional via `"deaf-signal/presets"` or the same package root.

Or load `../src/index.js` from the demo page as shown in `examples/demo.html`.

## Pull requests

- Keep changes focused and small.
- Prefer accessibility-friendly defaults (`role="alert"`, high contrast).
- Keep demo i18n **LT + EN** in sync if changing UI strings.
- Do not add sound-based APIs - this library is intentionally silent.

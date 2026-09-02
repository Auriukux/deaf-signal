# Contributing

Thanks for helping improve **deaf-signal** - visual + haptic alerts with no sound.

## Run the demo

Preferred - from the repo root:

```bash
npm run demo
```

Then open **http://localhost:3000** (or `/demo`). `index.html` / `serve.json` redirect to `examples/demo.html`.

On a phone on the same Wi-Fi (or via a localhost tunnel), the demo is installable as a PWA from the browser / **Install app** button.

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
  requestNotifyPermission,
  notifyAlert,
} from "deaf-signal";
```

Presets (`PATTERN_*`, `PRESETS`, `getPreset`) are optional via `"deaf-signal/presets"` or the same package root.

Notification helpers (`requestNotifyPermission`, `notifyAlert`, …) live in `src/notify.js` and are re-exported from the package root (`"deaf-signal/notify"` also works). Request permission from a **user gesture**. True OS background alerts typically need an **installed PWA** / browser support — do not assume a backgrounded tab will always deliver notifications.

Or load `../src/index.js` from the demo page as shown in `examples/demo.html`.

## Pull requests

- CI runs on push/PR to main; keep the Node test suite green.
- Keep changes focused and small.
- Prefer accessibility-friendly defaults (`role="alert"`, high contrast).
- Keep demo i18n **LT + EN** in sync if changing UI strings.
- Do not add sound-based APIs - this library is intentionally silent.

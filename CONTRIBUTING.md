# Contributing

Thanks for helping improve **deaf-signal** - visual + haptic alerts with no sound.

## Run the demo

**Preferred:** clone the repo and run from the project root (see README path A):

```bash
git clone https://github.com/Auriukux/deaf-signal.git
cd deaf-signal
npm run demo
```

Then open **http://localhost:3000** (or `/demo`). `index.html` / `serve.json` redirect to `examples/demo.html` locally.

On a phone on the same Wi-Fi (or via a localhost tunnel), the demo is installable as a PWA from the browser / **Install app** button.

Same server without the npm script:

```bash
npx --yes serve .
```

**Hosted demo (no clone):** GitHub Pages — https://auriukux.github.io/deaf-signal/ (see README).

The demo UI has an **LT | EN** language toggle. Vibration: mobile often gets a real vibrate; desktop uses a visual shake fallback when `shakeFallback` is on.

**Library install note:** GitHub package install is src-only (+ LICENSE / README). No demo under node_modules. Do not use `--prefix` / node_modules demo paths. Demo via clone or Pages — see README.

**iPhone / iOS / photosensitivity:** see README (no Vibration API on iOS Safari — visual shake; flashes rate-limited).

**PowerShell tip:** use the package demo script from the clone root (no && needed).

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

Optional mic loud listen: `"deaf-signal/listen"` (`startLoudListen`, …).

Or load `../src/index.js` from the demo page as shown in `examples/demo.html`.

## Pull requests

- CI runs on push/PR to main; keep tests and the package typecheck script green (includes all src d.ts files).
- Keep changes focused and small.
- Prefer accessibility-friendly defaults (`role="alert"`, high contrast).
- Keep demo i18n **LT + EN** in sync if changing UI strings.
- Do not add APIs that *play* sound — this library is intentionally silent (optional mic **loud**-level listen as *input* is OK).
- Optional mic loud listen (`src/listen.js`) uses a high RMS threshold by design; keep defaults strong and document overrides.

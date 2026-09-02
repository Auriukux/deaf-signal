# deaf-signal

**Visual and haptic web alerts — no sound.**  
A tiny ESM library for deaf / hard-of-hearing accessibility on the web.

Flash the screen, show a high-contrast banner, vibrate when supported, or combine them — without relying on audio.

**Live demo:** [https://auriukux.github.io/deaf-signal/](https://auriukux.github.io/deaf-signal/) ([examples/demo.html](https://auriukux.github.io/deaf-signal/examples/demo.html))

Not sure which folder you should be in? This README is a map. Follow the numbered steps and you will always know the path.

## Install + Demo

Pick **one** path: clone the repo to try the demo, or install the package into another project.

### A) Clone / develop (recommended for trying the demo)

1. Open a terminal in a folder you choose (for example Desktop).
2. Clone the repo — this creates a folder named `deaf-signal`:

```bash
git clone https://github.com/Auriukux/deaf-signal.git
```

3. Enter the project root (you should see `package.json`, `examples/`, and `src/`):

```bash
cd deaf-signal
```

4. Start the static demo server:

```bash
npm run demo
```

5. In your browser, open **http://localhost:3000** (or `/demo`). You should see the demo page with **LT | EN** language buttons.
6. Stop the server with **Ctrl+C** in the same terminal.

You can also copy `src/` into your project and import the modules directly.

ESM imports may be blocked from `file://`, so prefer this local server over opening `examples/demo.html` directly.

### B) Install as a dependency into another project

1. `cd` into **your** project folder (the one that already has your own `package.json`).
2. Install from GitHub (there is no npm registry package yet):

```bash
npm i github:Auriukux/deaf-signal
```

This puts the package in `node_modules/deaf-signal`.

3. Run the demo **from inside that package** — not from your project root. Avoid broken PowerShell `&&` by using one of these:

Cross-platform (any shell):

```bash
npm run demo --prefix node_modules/deaf-signal
```

PowerShell:

```powershell
cd node_modules\deaf-signal; npm run demo
```

Or two separate lines (any shell):

```bash
cd node_modules/deaf-signal
npm run demo
```

4. Browser: open **http://localhost:3000** (same as above).
5. In your code, import from `deaf-signal` as shown in **Usage** below.

**Note:** `npm run demo` in the **parent** folder fails with **Missing script** — the demo script lives inside the package, not on your project's `package.json`.

The demo UI has an LT | EN language toggle (choice saved in `localStorage`); the library API is English. With **Reduce motion** enabled, flash and pulse animations are skipped or softened automatically. Desktop browsers often expose Vibration API that does nothing — with `shakeFallback` (default on), visual shake always runs so the cue is visible.

`/` and `/demo` redirect to the demo page via `index.html` / `serve.json`.

**PWA:** with `npm run demo` reachable on your phone (same Wi-Fi or a localhost tunnel), open the demo and use the browser / **Install app** prompt to add deaf-signal to the home screen. Installed PWAs are the realistic path for background Notification alerts when the tab is not focused.

## TypeScript

The package ships with TypeScript declaration files (`src/*.d.ts`). No separate `@types` package is needed — editors and `tsc` pick up types from `"types": "./src/index.d.ts"` and the `exports` `types` conditions.

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
  requestNotifyPermission,
  notifyAlert,
  runAlert,
  getAlert,
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

// Background-style alert (Notification permission + visual cues when tab is visible)
await requestNotifyPermission();
await notifyAlert("Incoming alert", {
  body: "Check your messages",
  level: "urgent",
  tag: "deaf-signal",
  flash: true,
  shake: true,
  combo: true,
});

// Product-level presentation presets (siren / horn / door / …)
await runAlert("siren");
await runAlert("horn", { message: "Horn nearby!" });
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
| `requestNotifyPermission()` | Request Notification permission (`granted` / `denied` / … / `unsupported`) |
| `notifyAlert(title, opts?)` | System Notification when permitted; when the page is visible also flash / shake / combo |
| `isNotificationSupported()` / `getNotifyPermission()` | Feature / permission helpers |
| `getAlert(name)` | Look up a product alert preset (`call` / `message` / `door` / `siren` / `horn` / `urgent`) |
| `runAlert(name, opts?)` | Run preset via `alertCombo` + optional `notifyAlert` when Notification permission is granted |

`flashScreen`, `pulseBorder`, `shakeElement`, and `alertCombo` accept optional `reduceMotion: boolean`. When omitted, they follow the OS `prefers-reduced-motion: reduce` media query.

### Vibration presets

Named patterns live in `src/presets.js` (also re-exported from the package root):

| Export | Pattern (ms) | Typical use |
| --- | --- |
| `PATTERN_CALL` | `[300, 120, 300, 120, 300]` | Incoming call / ring cue |
| `PATTERN_MESSAGE` | `[100, 80, 100]` | New message / notification |
| `PATTERN_URGENT` | `[200, 80, 200, 80, 200, 80, 500]` | Urgent / alarm |
| `PRESETS` / `getPreset(name)` | map / lookup | `getPreset("call")` |

```js
import { vibratePattern, PATTERN_MESSAGE, getPreset } from "deaf-signal";

vibratePattern(PATTERN_MESSAGE);
vibratePattern(getPreset("urgent"));
```


### Product alert presets

Named **presentation** presets live in `src/alerts.js` (also re-exported from the package root). They bundle banner copy, severity, flash color, vibrate pattern, and shake options for common danger / event cues your app may already detect — **not** a sound classifier (no microphone, no ML).

| Export | Default EN message | Level | Typical use |
| --- | --- | --- | --- |
| `ALERT_CALL` | Incoming call | `warn` | Ring / call cue |
| `ALERT_MESSAGE` | New message | `info` | Soft notification |
| `ALERT_DOOR` | Door / doorbell | `warn` | Doorbell / knock |
| `ALERT_SIREN` | Siren detected nearby | `urgent` | Emergency siren presentation |
| `ALERT_HORN` | Horn / vehicle alert | `urgent` | Vehicle horn presentation |
| `ALERT_URGENT` | Urgent alert | `urgent` | Generic high-priority |
| `ALERTS` / `getAlert(name)` / `runAlert(name, opts?)` | map / lookup / run | | `runAlert("siren")` |

```js
import { runAlert, getAlert, ALERT_DOOR } from "deaf-signal";

await runAlert("door");
console.log(getAlert("horn").vibratePattern);
await runAlert("call", { message: ALERT_DOOR.message }); // override freely
```

Existing `PATTERN_*` / `getPreset()` vibrate-only presets remain unchanged.

### Background notifications

`requestNotifyPermission()` + `notifyAlert(title, opts?)` use the browser **Notification** API (zero deps). When the document is hidden, the system notification (and notification `vibrate` where supported) is the main cue. When the tab is visible, `notifyAlert` also calls the existing flash / shake / combo helpers.

Browsers only grant permission after a **user gesture**. True OS-level background delivery usually requires an **installed PWA** (and browser support) — a normal tab may pause or throttle when fully backgrounded. Missing Notification API → graceful no-ops for the notification part; visible visual cues still run.

## Why

Many web apps still signal only with sound. This package makes it easy to add **sight + touch** cues so alerts are usable without hearing.

## License

MIT © Auriukux

---

## Lietuviškai (trumpai)

`deaf-signal` — maža ESM biblioteka **vizualiems ir haptic (vibracijos / drebėjimo) įspėjimams**.
Tinka prieinamumui kurtiesiems / neprigirdintiems.
Nežinote, kuriame aplanke esate? Šis README — žemėlapis. Eikite pagal numerius.

### A) Klonuoti / bandyti demo

1. Atidarykite terminalą pasirinktame aplanke (pvz. Desktop).
2. `git clone https://github.com/Auriukux/deaf-signal.git` → sukuria aplanką `deaf-signal`.
3. `cd deaf-signal` → dabar esate projekto šaknyje (`package.json`, `examples/`, `src/`).
4. `npm run demo` → paleidžia serverį.
5. Naršyklėje: **http://localhost:3000** (arba `/demo`) → demo su **LT | EN**.
6. Stabdyti: **Ctrl+C** tame pačiame terminale.

### B) Įdiegti kaip priklausomybę į kitą projektą

1. `cd` į **savo** projekto aplanką (su jūsų `package.json`).
2. `npm i github:Auriukux/deaf-signal` → įdiegia į `node_modules/deaf-signal`.
3. Paleiskite demo **iš paketo vidaus** (ne iš tėvinio aplanko). Venkite PowerShell `&&`:
   - Bet kuriame shell: `npm run demo --prefix node_modules/deaf-signal`
   - PowerShell: `cd node_modules\deaf-signal; npm run demo`
   - Arba dvi eilutės: `cd` tada `npm run demo`
4. Naršyklė: **http://localhost:3000**.
5. Kode importuokite iš `deaf-signal` (žr. **Usage**).

**Pastaba:** tėviniame aplanke `npm run demo` duoda **Missing script** — demo skriptas yra tik pakete.

Skubus (urgent) flash — raudonas; jei vibracija neveikia (pvz. desktop), veikia vizualus drebėjimas.

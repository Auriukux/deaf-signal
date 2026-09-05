# deaf-signal

**Visual and haptic web alerts — no sound.**  
A tiny ESM library for deaf / hard-of-hearing accessibility on the web.

Flash the screen, show a high-contrast banner, vibrate when supported, or combine them — without relying on audio.

**Live demo:** [https://auriukux.github.io/deaf-signal/](https://auriukux.github.io/deaf-signal/) ([examples/demo.html](https://auriukux.github.io/deaf-signal/examples/demo.html))

> **Presets are cues you trigger — not classifiers.** `ALERT_SIREN` / `ALERT_HORN` / door / call are **presentation** patterns your app runs when *you* decide an event happened. They do **not** detect sirens, horns, or other sounds.

> **iPhone / iOS Safari:** `navigator.vibrate` **does not work**. Users get **visual shake only**. True haptics need a native app or installed-app constraints — **not** the Vibration API.

> **Photosensitivity:** full-viewport flashes are **rate-limited** (about max 2 full flashes / 1s, WCAG-minded to stay under 3 flashes/second). Screen flashing can affect people with photosensitive epilepsy — use reduce-motion and avoid rapid manual triggering.

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

### B) Install as a library into another project

1. `cd` into **your** project folder (the one that already has your own `package.json`).
2. Install from GitHub (there is no npm registry package yet):

```bash
npm i github:Auriukux/deaf-signal
```

This puts the package in `node_modules/deaf-signal`. The published package `files` list includes only **`src/`** (plus LICENSE / README) — **not** `examples/` or the demo server. A GitHub install is **library-only**: import modules in your app; do **not** expect `npm run demo` to work from `node_modules`.

3. In your code, import from `deaf-signal` as shown in **Usage** below.

**To try the interactive demo:** use path **A** (git clone + `npm run demo`) or open the hosted demo on **GitHub Pages**: [https://auriukux.github.io/deaf-signal/](https://auriukux.github.io/deaf-signal/) ([examples/demo.html](https://auriukux.github.io/deaf-signal/examples/demo.html)).

The demo UI has an LT | EN language toggle (choice saved in `localStorage`); the library API is English. With **Reduce motion** enabled, flash and pulse animations are skipped or softened automatically. Desktop browsers often expose Vibration API that does nothing — with `shakeFallback` (default on), visual shake always runs so the cue is visible. **iPhone Safari:** no Vibration API — visual shake only. Demo copy marks product buttons as **manual cues** and mic as **loudness peak only**. Flashes are rate-limited; the demo shows a short photosensitive-epilepsy warning.

**GitHub Pages** (no serve.json redirects on hosting): open /, /demo/, or /examples/demo.html. Local npx serve still uses serve.json for / and /demo.

**PWA:** with `npm run demo` reachable on your phone (same Wi-Fi or a localhost tunnel), open the demo and use the browser / **Install app** prompt to add deaf-signal to the home screen. Installed PWAs are the realistic path for background Notification alerts when the tab is not focused. With a controlling Service Worker, `notifyAlert` uses `registration.showNotification` (SW path); without one it falls back to page `new Notification(...)`. A backgrounded tab can still show SW notifications while the SW is alive; a **fully killed** app remains OS-limited (especially on iOS).

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
  icon: "/path/to/your-icon.png", // pass your own icon URL; default is no icon
  flash: true,
  shake: true,
  combo: true,
});

// Product-level presentation presets (siren / horn / door / …)
await runAlert("siren"); // presentation cue — not "siren detected"
await runAlert("horn", { message: "Loud alert cue" });
```

## API

| Function | Description |
| --- | --- |
| `flashScreen(opts?)` | Full-viewport flash; auto contrast when `color` omitted; **rate-limited** for photosensitivity; skips when `reduceMotion` / `prefers-reduced-motion` |
| `contrastFlashColor(root?)` | Helper: `#ffffff` on dark backgrounds, `#111111` on light |
| `showBanner(message, opts?)` | Top banner with `role="alert"` |
| `vibratePattern(pattern?, opts?)` | Calls `navigator.vibrate` when available; when `shakeFallback` is on (default `true`), **always** runs visual `shakeElement` too (desktop vibrate is often a no-op) |
| `shakeElement(target, opts?)` | Strong CSS / Web Animations shake (`deaf-signal-shake`, ~±16px + rotate); opacity pulse when reduced motion; cleans up after |
| `isVibrateSupported()` | `true` when Vibration API is present |
| `alertCombo(message, opts?)` | Flash + banner + vibrate/shake; urgent flash is always red `#e53935` when `flashColor` omitted (other levels use auto contrast) |
| `pulseBorder(target, opts?)` | Pulse element border; static outline when reduced motion |
| `requestNotifyPermission()` | Request Notification permission (`granted` / `denied` / … / `unsupported`) |
| `notifyAlert(title, opts?)` | System Notification when permitted (SW `showNotification` if controlling SW, else page `Notification`); when visible also flash / shake / combo |
| `isNotificationSupported()` / `getNotifyPermission()` / `hasControllingServiceWorker()` | Feature / permission / SW helpers |
| `runAlert(name, opts?)` | Run preset via `alertCombo` + optional `notifyAlert`; **unknown name → `false` + `console.warn`** (fail-closed) |
| `isListenSupported()` / `getInputLevel()` | Feature helper / live RMS while listening |
| `startLoudListen(opts?)` / `stopLoudListen()` | Optional mic **loud**-sound detect (Web Audio RMS); high threshold by default |

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

Named **presentation** presets live in `src/alerts.js` (also re-exported from the package root). They bundle banner copy, severity, flash color, vibrate pattern, and shake options for common event **cues you trigger** — **not** a sound classifier (no microphone, no ML). Treat them as labeled patterns your app fires after *your* own detection or UI action; they never listen for or identify real-world sounds.

| Export | Default EN message | Level | Typical use |
| --- | --- | --- | --- |
| `ALERT_CALL` | Incoming call | `warn` | Ring / call cue |
| `ALERT_MESSAGE` | New message | `info` | Soft notification |
| `ALERT_DOOR` | Door / doorbell | `warn` | Doorbell / knock |
| `ALERT_SIREN` | Urgent alert | `urgent` | Loud / urgent **cue** (not detection) |
| `ALERT_HORN` | Loud alert cue | `urgent` | Loud **cue** (not horn recognition) |
| `ALERT_URGENT` | Urgent alert | `urgent` | Generic high-priority |
| `ALERTS` / `getAlert(name)` / `runAlert(name, opts?)` | map / lookup / run | | `runAlert("siren")` |

```js
import { runAlert, getAlert, ALERT_DOOR } from "deaf-signal";

const r = await runAlert("door");
if (r === false) return; // unknown name → false + console.warn (fail-closed)
console.log(r.alert.name, getAlert("horn").vibratePattern);
await runAlert("call", { message: ALERT_DOOR.message }); // override freely
```

Existing `PATTERN_*` / `getPreset()` vibrate-only presets remain unchanged.

### Background notifications

`requestNotifyPermission()` + `notifyAlert(title, opts?)` use the browser **Notification** API (zero deps).

**SW path vs page Notification:** when a **controlling Service Worker** exists (`hasControllingServiceWorker()`), `notifyAlert` prefers `ServiceWorkerRegistration.showNotification` (better for backgrounded / installed PWA demos). Otherwise it falls back to page `new Notification(...)`. The demo SW (`examples/sw.js`) also handles `notificationclick` (focus/open the demo) and `message` events `{ type: 'deaf-signal-notify', title, options }`.

When the document is hidden, the system notification (and notification `vibrate` where supported) is the main cue. When the tab is visible, `notifyAlert` also calls the existing flash / shake / combo helpers (combo:true uses one haptic path via alertCombo and skips stacking Notification.vibrate while visible).

Pass `icon` (absolute or page-relative URL) when you want a Notification icon; omitted / `undefined` means **no icon** (the library does not assume `./icons/icon-192.png`). Pass `icon: false` to force omit. The demo passes an explicit icon path.

Browsers only grant permission after a **user gesture**. True OS-level background delivery usually requires an **installed PWA** (and browser support). A backgrounded tab can still deliver SW notifications while the worker is alive; a **fully killed** app is still OS-limited (especially iOS). Page-only Notifications need the tab to stay alive. Missing Notification API → graceful no-ops for the notification part; visible visual cues still run.

### Optional mic loud listen

`startLoudListen(opts?)` is an **optional** helper, kept **separate from product alerts** (`ALERT_SIREN` / door / horn / call). It asks for microphone permission, measures RMS via Web Audio (`AnalyserNode`, fftSize 2048), and fires only on **strong loudness peaks / loudPeak** (default threshold **0.25** RMS, cooldown `minIntervalMs` 2500). It is **not** a sound classifier — no ML, no cloud — **RMS ≠ siren / door / horn**. Quiet rooms / soft speech should not trip. On exceed: `onLoud({ level, rms })` and/or a **neutral** auto `runAlert("urgent")` (default); pass `alert: false` for callback-only. Product event names (`siren`, `door`, …) are remapped to `"urgent"`; **unknown** names skip the auto-alert entirely (no urgent fire) — use the product preset buttons / `runAlert("siren")` for those cues. A second `startLoudListen` aborts any in-flight first start. Always call `stopLoudListen()` / `controller.stop()` to release the mic; sessions also auto-stop on **page unload** (`pagehide` / `beforeunload`) so the mic is not left open. **Listening continues while the tab is hidden** (background tab); pass `stopOnHidden: true` to restore the old auto-stop-on-hidden behavior. Requires a secure context (HTTPS / localhost).

```js
import { startLoudListen, stopLoudListen, DEFAULT_LOUD_THRESHOLD } from "deaf-signal";

const ctrl = await startLoudListen({
  threshold: DEFAULT_LOUD_THRESHOLD, // 0.25 — loudPeak only
  onLoud: ({ rms }) => console.log("loudPeak", rms),
  alert: "urgent", // neutral loudPeak cue — not ALERT_SIREN / door
  // alert: false, // callback-only alternative
});
// Product presets stay separate: await runAlert("siren") from your own UI.
// later:
ctrl.stop();
```

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

### B) Įdiegti kaip biblioteką į kitą projektą

1. `cd` į **savo** projekto aplanką (su jūsų `package.json`).
2. `npm i github:Auriukux/deaf-signal` → įdiegia į `node_modules/deaf-signal`. Paketas (`files`) turi tik **`src/`** (+ LICENSE / README) — **be** `examples/` ir demo serverio. GitHub diegimas = **tik biblioteka**; `npm run demo` iš `node_modules` neveiks.
3. Kode importuokite iš `deaf-signal` (žr. **Usage**).

**Demo:** kelias **A** (klonavimas + `npm run demo`) arba **GitHub Pages**: [https://auriukux.github.io/deaf-signal/](https://auriukux.github.io/deaf-signal/).

Skubus (urgent) flash — raudonas; jei vibracija neveikia (pvz. desktop ar **iPhone Safari**), veikia vizualus drebėjimas (`navigator.vibrate` iOS neveikia).

**Svarbu:** produkto presetai (`ALERT_SIREN` ir kt.) — tai **signalai, kuriuos paleidžiate patys**, ne klasifikatoriai. Mirksėjimas ribojamas dėl fotosensityvumo / epilepsijos.

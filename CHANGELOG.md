# Changelog

## 0.2.0 — 2026-09-05

Breaking defaults / a11y hardening for the `0.x` library API.

### Breaking
- **`startLoudListen`**: default `alert` is now **`false`** (callback-only via `onLoud`). Pass `alert: "urgent"` (or `DEFAULT_LOUD_ALERT`) to auto-run a product alert.
- **`runAlert`**: default **`notify: false`**. Pass `{ notify: true }` to show a system Notification when permission is already granted (0.1 auto-notified when granted).
- **`vibratePattern` / shake fallback**: no longer shakes `document.body` or `main` by default. Pass an **explicit** `target` / `shakeTarget` (Element or selector).
- Shared **`PATTERN_*` / `PRESETS` / `ALERT_*` / `ALERTS`** are **`Object.freeze`d** (nested pattern arrays + shake objects frozen). `getPreset` / `getAlert` still return **mutable copies**.

### Added / changed
- Public cue patterns: **`PATTERN_DOOR`**, **`PATTERN_SIREN`**, **`PATTERN_HORN`** (vibration cues — not detectors/classifiers). Also listed in `PRESETS` / `getPreset`.
- **`flashScreen`**: `durationMs` clamped to **`FLASH_DURATION_MAX` (800ms)** via `clampFlashDuration` (photosensitivity / a11y).
- **`shouldReduceMotion`**: on `matchMedia` **error**, treat as **reduce** (prefer less motion).
- `settleFlashResolve` remains on **`deaf-signal/signals`** only (not the package root).

### Migration
```js
// Loud listen — opt into alert
await startLoudListen({ alert: "urgent", onLoud: (e) => {} });

// Product alert — opt into Notification
await runAlert("siren", { notify: true, shakeTarget: ".card" });

// Shake — always pass a target
vibratePattern(PATTERN_MESSAGE, { target: "#panel" });
```

/**
 * Product-level alert presets (presentation only).
 * Inspired by danger-detection use cases (siren / horn / door / call) —
 * these are visual + haptic cues for when *your* app detects an event.
 * Not a sound classifier; no mic / ML.
 * @module deaf-signal/alerts
 */

import { alertCombo } from "./signals.js";
import {
  PATTERN_CALL,
  PATTERN_MESSAGE,
  PATTERN_URGENT,
  PATTERN_DOOR,
  PATTERN_SIREN,
  PATTERN_HORN,
} from "./presets.js";
import { notifyAlert } from "./notify.js";

// Re-export cue vibration patterns (not detectors / classifiers)
export { PATTERN_DOOR, PATTERN_SIREN, PATTERN_HORN };

/**
 * @typedef {object} AlertPreset
 * @property {string} name Canonical lowercase key
 * @property {string} message Default EN banner / notification title
 * @property {string} [body] Optional EN body for notifications
 * @property {"info"|"warn"|"urgent"} level
 * @property {string} [flashColor] Explicit flash color
 * @property {number[]} vibratePattern
 * @property {{ durationMs?: number, amplitudePx?: number }} [shake]
 * @property {number} [durationMs] Banner auto-dismiss (ms); siren/horn longer
 * @property {boolean} [requireInteraction]
 */

/** @type {AlertPreset} */
export const ALERT_CALL = Object.freeze({
  name: "call",
  message: "Incoming call",
  body: "Someone is calling — check your device.",
  level: "warn",
  flashColor: "#42a5f5",
  vibratePattern: Object.freeze(PATTERN_CALL.slice()),
  shake: Object.freeze({ durationMs: 550, amplitudePx: 16 }),
  durationMs: 3500,
});

/** @type {AlertPreset} */
export const ALERT_MESSAGE = Object.freeze({
  name: "message",
  message: "New message",
  body: "You have a new message.",
  level: "info",
  flashColor: "#66bb6a",
  vibratePattern: Object.freeze(PATTERN_MESSAGE.slice()),
  shake: Object.freeze({ durationMs: 400, amplitudePx: 14 }),
  durationMs: 3000,
});

/** @type {AlertPreset} */
export const ALERT_DOOR = Object.freeze({
  name: "door",
  message: "Door / doorbell",
  body: "Someone is at the door.",
  level: "warn",
  flashColor: "#ffa726",
  vibratePattern: Object.freeze(PATTERN_DOOR.slice()),
  shake: Object.freeze({ durationMs: 600, amplitudePx: 16 }),
  durationMs: 4000,
});

/** @type {AlertPreset} */
export const ALERT_SIREN = Object.freeze({
  name: "siren",
  message: "Urgent alert",
  body: "Loud alert cue — presentation only, not detection.",
  level: "urgent",
  flashColor: "#e53935",
  vibratePattern: Object.freeze(PATTERN_SIREN.slice()),
  shake: Object.freeze({ durationMs: 700, amplitudePx: 18 }),
  durationMs: 6000,
  requireInteraction: true,
});

/** @type {AlertPreset} */
export const ALERT_HORN = Object.freeze({
  name: "horn",
  message: "Loud alert cue",
  body: "Loud alert cue — presentation only, not detection.",
  level: "urgent",
  flashColor: "#ff7043",
  vibratePattern: Object.freeze(PATTERN_HORN.slice()),
  shake: Object.freeze({ durationMs: 650, amplitudePx: 17 }),
  durationMs: 5500,
  requireInteraction: true,
});

/** @type {AlertPreset} */
export const ALERT_URGENT = Object.freeze({
  name: "urgent",
  message: "Urgent alert",
  body: "Immediate attention required.",
  level: "urgent",
  flashColor: "#e53935",
  vibratePattern: Object.freeze(PATTERN_URGENT.slice()),
  shake: Object.freeze({ durationMs: 650, amplitudePx: 18 }),
  durationMs: 4500,
  requireInteraction: true,
});

/** Map of preset name -> alert definition (frozen) */
export const ALERTS = Object.freeze({
  call: ALERT_CALL,
  message: ALERT_MESSAGE,
  door: ALERT_DOOR,
  siren: ALERT_SIREN,
  horn: ALERT_HORN,
  urgent: ALERT_URGENT,
});

/**
 * Look up a named product alert preset.
 * Returns a shallow copy with sliced `vibratePattern` and copied `shake`
 * so callers cannot mutate shared `ALERT_*` / `ALERTS` entries (parity with {@link getPreset}).
 * @param {"call"|"message"|"door"|"siren"|"horn"|"urgent"|string} name
 * @returns {AlertPreset|undefined}
 */
export function getAlert(name) {
  if (name == null) return undefined;
  const preset = ALERTS[String(name).toLowerCase()];
  if (!preset) return undefined;
  return {
    ...preset,
    vibratePattern: preset.vibratePattern.slice(),
    shake: preset.shake ? { ...preset.shake } : undefined,
  };
}

/**
 * Run a named product alert: {@link alertCombo} plus optional {@link notifyAlert}
 * when the caller opts in with `{ notify: true }` (and Notification permission is granted).
 *
 * **Breaking (0.2):** `notify` defaults to `false`. Previously auto-notified when
 * permission was already granted — pass `{ notify: true }` to restore that.
 *
 * Overrides via `opts`: `message`, `body`, `level`, `flashColor`, `vibratePattern`,
 * `shake` / `shakeTarget` / `shakeFallback`, `durationMs`, `closeLabel`, `reduceMotion`,
 * `notify` (opt-in), plus any `alertCombo` flags (`flash`, `banner`, `vibrate`).
 *
 * @param {"call"|"message"|"door"|"siren"|"horn"|"urgent"|string} name
 * @param {object} [opts]
 * @returns {Promise<false|{ alert: AlertPreset, combo: object, notification: object|null }>} `false` + console.warn for unknown names
 */
export async function runAlert(name, opts = {}) {
  const preset = getAlert(name);
  if (!preset) {
    const label = String(name);
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(
        `[deaf-signal] runAlert: unknown alert name "${label}" — no-op (fail-closed).`
      );
    }
    return false;
  }

  const message =
    opts.message != null ? String(opts.message) : preset.message;
  const body = opts.body != null ? String(opts.body) : preset.body || "";
  const level = opts.level || preset.level;
  const flashColor =
    opts.flashColor !== undefined ? opts.flashColor : preset.flashColor;
  const vibratePattern =
    opts.vibratePattern != null
      ? opts.vibratePattern
      : preset.vibratePattern.slice();

  const shake =
    opts.shake !== undefined
      ? opts.shake
      : preset.shake
        ? { ...preset.shake }
        : undefined;
  const durationMs =
    opts.durationMs != null ? opts.durationMs : preset.durationMs;

  const combo = await alertCombo(message, {
    flash: opts.flash !== false,
    banner: opts.banner !== false,
    vibrate: opts.vibrate !== false,
    level,
    flashColor,
    vibratePattern,
    shakeFallback: opts.shakeFallback !== false,
    shakeTarget: opts.shakeTarget,
    shake,
    durationMs,
    closeLabel: opts.closeLabel,
    reduceMotion: opts.reduceMotion,
  });

  let notification = null;
  // Opt-in only — default notify: false (breaking vs 0.1 auto-notify when granted)
  const wantNotify = opts.notify === true;

  if (wantNotify) {
    // In-page cues already ran via alertCombo — ask notifyAlert for the
    // system Notification only (flash/shake/combo off; omit vibrate so
    // runVisibleCues does not fire a second haptic).
    notification = await notifyAlert(message, {
      body,
      level,
      flash: false,
      shake: false,
      combo: false,
      tag: opts.tag || `deaf-signal-alert-${preset.name}`,
      requireInteraction:
        opts.requireInteraction != null
          ? opts.requireInteraction
          : preset.requireInteraction,
      notification: true,
      reduceMotion: opts.reduceMotion,
    });
  }

  return { alert: preset, combo, notification };
}

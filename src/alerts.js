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
} from "./presets.js";
import {
  notifyAlert,
  getNotifyPermission,
} from "./notify.js";

/** Long door-knock style pulse */
const PATTERN_DOOR = [180, 100, 180, 100, 180, 280, 400];

/** Rapid repeating siren-like pulse */
const PATTERN_SIREN = [120, 60, 120, 60, 120, 60, 120, 60, 300];

/** Sharp double-blast horn cue */
const PATTERN_HORN = [450, 150, 450, 150, 600];

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
export const ALERT_CALL = {
  name: "call",
  message: "Incoming call",
  body: "Someone is calling — check your device.",
  level: "warn",
  flashColor: "#42a5f5",
  vibratePattern: PATTERN_CALL.slice(),
  shake: { durationMs: 550, amplitudePx: 16 },
  durationMs: 3500,
};

/** @type {AlertPreset} */
export const ALERT_MESSAGE = {
  name: "message",
  message: "New message",
  body: "You have a new message.",
  level: "info",
  flashColor: "#66bb6a",
  vibratePattern: PATTERN_MESSAGE.slice(),
  shake: { durationMs: 400, amplitudePx: 14 },
  durationMs: 3000,
};

/** @type {AlertPreset} */
export const ALERT_DOOR = {
  name: "door",
  message: "Door / doorbell",
  body: "Someone is at the door.",
  level: "warn",
  flashColor: "#ffa726",
  vibratePattern: PATTERN_DOOR.slice(),
  shake: { durationMs: 600, amplitudePx: 16 },
  durationMs: 4000,
};

/** @type {AlertPreset} */
export const ALERT_SIREN = {
  name: "siren",
  message: "Urgent alert",
  body: "Loud alert cue — presentation only, not detection.",
  level: "urgent",
  flashColor: "#e53935",
  vibratePattern: PATTERN_SIREN.slice(),
  shake: { durationMs: 700, amplitudePx: 18 },
  durationMs: 6000,
  requireInteraction: true,
};

/** @type {AlertPreset} */
export const ALERT_HORN = {
  name: "horn",
  message: "Loud alert cue",
  body: "Loud alert cue — presentation only, not detection.",
  level: "urgent",
  flashColor: "#ff7043",
  vibratePattern: PATTERN_HORN.slice(),
  shake: { durationMs: 650, amplitudePx: 17 },
  durationMs: 5500,
  requireInteraction: true,
};

/** @type {AlertPreset} */
export const ALERT_URGENT = {
  name: "urgent",
  message: "Urgent alert",
  body: "Immediate attention required.",
  level: "urgent",
  flashColor: "#e53935",
  vibratePattern: PATTERN_URGENT.slice(),
  shake: { durationMs: 650, amplitudePx: 18 },
  durationMs: 4500,
  requireInteraction: true,
};

/** Map of preset name -> alert definition */
export const ALERTS = {
  call: ALERT_CALL,
  message: ALERT_MESSAGE,
  door: ALERT_DOOR,
  siren: ALERT_SIREN,
  horn: ALERT_HORN,
  urgent: ALERT_URGENT,
};

/**
 * Look up a named product alert preset.
 * @param {"call"|"message"|"door"|"siren"|"horn"|"urgent"|string} name
 * @returns {AlertPreset|undefined}
 */
export function getAlert(name) {
  if (name == null) return undefined;
  return ALERTS[String(name).toLowerCase()];
}

/**
 * Run a named product alert: {@link alertCombo} plus optional {@link notifyAlert}
 * when Notification permission is already granted.
 *
 * Overrides via `opts`: `message`, `body`, `level`, `flashColor`, `vibratePattern`,
 * `shake` / `shakeTarget` / `shakeFallback`, `durationMs`, `closeLabel`, `reduceMotion`,
 * `notify` (force/disable notify), plus any `alertCombo` flags (`flash`, `banner`, `vibrate`).
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
  const wantNotify =
    opts.notify === true ||
    (opts.notify !== false && getNotifyPermission() === "granted");

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

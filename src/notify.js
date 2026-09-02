/**
 * Permission-based Notification alerts with visual + haptic cues when the page is visible.
 * Graceful no-ops when the Notification API is missing or permission is denied.
 * @module deaf-signal/notify
 */

import {
  flashScreen,
  alertCombo,
  vibratePattern,
} from "./signals.js";
import { PATTERN_MESSAGE, PATTERN_URGENT, PATTERN_CALL } from "./presets.js";

/**
 * @returns {boolean}
 */
export function isNotificationSupported() {
  return typeof Notification !== "undefined";
}

/**
 * Current permission, or `"unsupported"` when the API is missing.
 * @returns {"default"|"granted"|"denied"|"unsupported"}
 */
export function getNotifyPermission() {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Request Notification permission (must be called from a user gesture in most browsers).
 * @returns {Promise<"default"|"granted"|"denied"|"unsupported">}
 */
export async function requestNotifyPermission() {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result || Notification.permission || "denied";
  } catch {
    return Notification.permission || "denied";
  }
}

/**
 * @returns {boolean}
 */
function isDocumentHidden() {
  return typeof document !== "undefined" && !!document.hidden;
}

/**
 * Map alert level to a default vibration pattern.
 * @param {string} level
 * @returns {number[]}
 */
function defaultVibrateForLevel(level) {
  const key = String(level || "info").toLowerCase();
  if (key === "urgent" || key === "critical" || key === "high") {
    return PATTERN_URGENT.slice();
  }
  if (key === "warn" || key === "warning" || key === "call") {
    return PATTERN_CALL.slice();
  }
  return PATTERN_MESSAGE.slice();
}

/**
 * Map library level to Notification `urgency` when supported (Chromium).
 * @param {string} level
 * @returns {"low"|"normal"|"high"|"critical"|undefined}
 */
function urgencyFromLevel(level) {
  const key = String(level || "info").toLowerCase();
  if (key === "urgent" || key === "critical") return "critical";
  if (key === "high") return "high";
  if (key === "warn" || key === "warning") return "normal";
  if (key === "low") return "low";
  return "normal";
}

/**
 * Show a system Notification when permitted.
 * @param {string} title
 * @param {object} opts
 * @returns {Notification|null}
 */
function showSystemNotification(title, opts) {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  const {
    body = "",
    tag,
    icon,
    vibrate,
    level = "info",
    urgency,
    requireInteraction,
    silent,
  } = opts;

  /** @type {NotificationOptions} */
  const nOpts = {
    body: body || undefined,
    tag: tag || undefined,
    icon: icon || undefined,
    requireInteraction:
      requireInteraction != null
        ? !!requireInteraction
        : String(level).toLowerCase() === "urgent",
    silent: silent === true ? true : undefined,
  };

  const pattern =
    vibrate != null ? vibrate : defaultVibrateForLevel(level);
  // Chromium / Android: vibration on the notification itself
  if (pattern && silent !== true) {
    nOpts.vibrate = pattern;
  }

  const urg = urgency || urgencyFromLevel(level);
  if (urg) {
    try {
      nOpts.urgency = urg;
    } catch {
      /* ignore */
    }
  }

  try {
    return new Notification(String(title || "Alert"), nOpts);
  } catch {
    // Some browsers reject unknown option keys — retry with a minimal set
    try {
      return new Notification(String(title || "Alert"), {
        body: body || undefined,
        tag: tag || undefined,
        icon: icon || undefined,
      });
    } catch {
      return null;
    }
  }
}

/**
 * Run in-page visual / haptic cues (page must be visible / have a document).
 * @param {string} title
 * @param {object} opts
 * @returns {Promise<void>}
 */
async function runVisibleCues(title, opts) {
  if (typeof document === "undefined") return;

  const {
    body = "",
    level = "info",
    flash = true,
    shake = true,
    combo = false,
    vibrate,
    shakeTarget,
    reduceMotion,
  } = opts;

  const message = body ? `${title} — ${body}` : String(title || "Alert");
  const pattern =
    vibrate != null ? vibrate : defaultVibrateForLevel(level);

  if (combo) {
    await alertCombo(message, {
      level: level === "warn" || level === "urgent" || level === "info" ? level : "warn",
      flash: flash !== false,
      vibrate: true,
      vibratePattern: pattern,
      shakeFallback: shake !== false,
      shakeTarget:
        shakeTarget ||
        document.querySelector("main") ||
        document.body,
      reduceMotion,
    });
    return;
  }

  const tasks = [];
  if (flash) {
    const flashOpts = { reduceMotion };
    if (String(level).toLowerCase() === "urgent") {
      flashOpts.color = "#e53935";
    }
    tasks.push(flashScreen(flashOpts));
  }

  if (shake) {
    const target =
      shakeTarget ||
      document.querySelector("main") ||
      document.body;
    // vibratePattern also shakes when shakeFallback is on
    vibratePattern(pattern, {
      shakeFallback: true,
      target,
      reduceMotion,
    });
  } else if (vibrate != null) {
    vibratePattern(pattern, { shakeFallback: false });
  } else if (flash && !shake) {
    // flash-only already queued
  }

  await Promise.all(tasks);
}

/**
 * Background / permission-based alert.
 *
 * - When `document` is **hidden**: relies on a system {@link Notification}
 *   (plus notification `vibrate` where the browser supports it).
 * - When **visible**: runs flash / shake / combo via existing signals helpers;
 *   also shows a Notification when permission is already granted (optional tray cue).
 * - If the Notification API is missing or permission is not granted, visual cues
 *   still run when the page is visible; otherwise this is a graceful no-op.
 *
 * @param {string} title Notification / alert title
 * @param {object} [opts]
 * @param {string} [opts.body] Notification body / appended to visible message
 * @param {"info"|"warn"|"urgent"|string} [opts.level="info"] Severity (also drives defaults)
 * @param {"low"|"normal"|"high"|"critical"|string} [opts.urgency] Notification urgency override
 * @param {string} [opts.tag] Notification tag (replaces prior with same tag)
 * @param {string} [opts.icon] Notification icon URL
 * @param {number|number[]} [opts.vibrate] Pattern for notification + in-page vibrate
 * @param {boolean} [opts.flash=true] When visible: flash the screen
 * @param {boolean} [opts.shake=true] When visible: shake / vibrate
 * @param {boolean} [opts.combo=false] When visible: use {@link alertCombo} (banner + flash + vibrate)
 * @param {Element|string} [opts.shakeTarget] Shake / pulse target
 * @param {boolean} [opts.requireInteraction] Keep notification until dismissed
 * @param {boolean} [opts.silent] Suppress notification sound/vibrate (library stays silent either way)
 * @param {boolean} [opts.notification] Force show/hide Notification when visible (`undefined` = show if granted)
 * @param {boolean} [opts.reduceMotion] Passed through to visual helpers
 * @returns {Promise<{ permission: string, notification: Notification|null, visibleCues: boolean }>}
 */
export async function notifyAlert(title, opts = {}) {
  const hidden = isDocumentHidden();
  const permission = getNotifyPermission();

  let notification = null;
  let visibleCues = false;

  const shouldNotify =
    permission === "granted" &&
    (hidden || opts.notification !== false);

  if (shouldNotify) {
    notification = showSystemNotification(title, opts);
  }

  if (!hidden) {
    await runVisibleCues(title, opts);
    visibleCues = true;
  }

  return { permission, notification, visibleCues };
}

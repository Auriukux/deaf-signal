/**
 * Permission-based Notification alerts with visual + haptic cues when the page is visible.
 * Prefers Service Worker `showNotification` when a controlling SW exists; otherwise
 * falls back to page `new Notification(...)`. Graceful no-ops when the Notification
 * API is missing or permission is denied.
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
 * Resolve Notification icon URL.
 * - `icon: false` -> omit icon
 * - string -> use as-is
 * - omitted / null / "" -> no icon (undefined)
 * Consumers should pass an explicit `icon` URL when they want one (e.g. demo / app asset).
 * @param {string|false|undefined|null} icon
 * @returns {string|undefined}
 */
export function resolveNotifyIcon(icon) {
  if (icon === false) return undefined;
  if (icon != null && icon !== "") return String(icon);
  return undefined;
}

/**
 * Build NotificationOptions shared by SW showNotification and page Notification.
 * @param {object} opts
 * @returns {NotificationOptions}
 */
function buildNotificationOptions(opts) {
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

  const resolvedIcon = resolveNotifyIcon(icon);

  /** @type {NotificationOptions} */
  const nOpts = {
    body: body || undefined,
    tag: tag || undefined,
    icon: resolvedIcon,
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

  return nOpts;
}

/**
 * True when a controlling Service Worker is active (installed PWA / registered SW).
 * @returns {boolean}
 */
export function hasControllingServiceWorker() {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    !!navigator.serviceWorker.controller
  );
}

/**
 * Show a system Notification when permitted.
 * Prefers `ServiceWorkerRegistration.showNotification` when a controlling SW
 * exists (better background / installed-PWA path); falls back to `new Notification`.
 * @param {string} title
 * @param {object} opts
 * @returns {Promise<Notification|null>}
 */
async function showSystemNotification(title, opts) {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  const nOpts = buildNotificationOptions(opts);
  const alertTitle = String(title || "Alert");
  const minimal = {
    body: nOpts.body,
    tag: nOpts.tag,
    icon: nOpts.icon,
  };

  // Prefer SW registration.showNotification when a controlling SW exists
  if (hasControllingServiceWorker()) {
    try {
      const registration = await navigator.serviceWorker.ready;
      try {
        await registration.showNotification(alertTitle, nOpts);
      } catch {
        await registration.showNotification(alertTitle, minimal);
      }
      // SW path does not return a Notification instance to the page
      return null;
    } catch {
      /* fall through to page Notification */
    }
  }

  try {
    return new Notification(alertTitle, nOpts);
  } catch {
    // Some browsers reject unknown option keys — retry with a minimal set
    try {
      return new Notification(alertTitle, minimal);
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
  }

  await Promise.all(tasks);
}

/**
 * Background / permission-based alert.
 *
 * - When `document` is **hidden**: relies on a system notification via the
 *   Service Worker (`registration.showNotification`) when a controlling SW exists,
 *   otherwise page `new Notification` (plus notification `vibrate` where supported).
 * - When **visible**: runs flash / shake / combo via existing signals helpers;
 *   also shows a Notification when permission is already granted (optional tray cue).
 * - If the Notification API is missing or permission is not granted, visual cues
 *   still run when the page is visible; otherwise this is a graceful no-op.
 * - SW path returns `notification: null` (no page Notification instance); page
 *   path returns the `Notification` object when constructed successfully.
 *
 * @param {string} title Notification / alert title
 * @param {object} [opts]
 * @param {string} [opts.body] Notification body / appended to visible message
 * @param {"info"|"warn"|"urgent"|string} [opts.level="info"] Severity (also drives defaults)
 * @param {"low"|"normal"|"high"|"critical"|string} [opts.urgency] Notification urgency override
 * @param {string} [opts.tag] Notification tag (replaces prior with same tag)
 * @param {string|false} [opts.icon] Notification icon URL; omit / undefined = no icon; pass a URL for an icon; `false` to skip
 * @param {number|number[]} [opts.vibrate] Pattern for notification + in-page vibrate
 * @param {boolean} [opts.flash=true] When visible: flash the screen
 * @param {boolean} [opts.shake=true] When visible: shake / vibrate
 * @param {boolean} [opts.combo=false] When visible: use {@link alertCombo} (banner + flash + vibrate); skips Notification.vibrate while visible so haptic is not doubled
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
    // When visible + combo, alertCombo owns the haptic path — skip
    // Notification.vibrate so we do not stack a second vibrate (match runAlert).
    const notifyOpts =
      !hidden && opts.combo === true
        ? { ...opts, vibrate: false }
        : opts;
    notification = await showSystemNotification(title, notifyOpts);
  }

  if (!hidden) {
    await runVisibleCues(title, opts);
    visibleCues = true;
  }

  return { permission, notification, visibleCues };
}

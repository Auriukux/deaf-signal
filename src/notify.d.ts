/**
 * Permission-based Notification alerts with visual + haptic cues when the page is visible.
 * Prefers Service Worker showNotification when a controlling SW exists.
 * @module deaf-signal/notify
 */

import type { AlertLevel } from "./signals.js";

export type NotifyPermission =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export type NotificationUrgency = "low" | "normal" | "high" | "critical";

export interface NotifyAlertOptions {
  /** Notification body / appended to visible message */
  body?: string;
  /** Severity (also drives defaults); default "info" */
  level?: AlertLevel | string;
  /** Notification urgency override (Chromium) */
  urgency?: NotificationUrgency | string;
  /** Notification tag (replaces prior with same tag) */
  tag?: string;
  /**
   * Notification icon URL.
   * Omit / undefined = no icon. Pass a URL (absolute or page-relative) for an icon.
   * Pass `false` to skip an icon explicitly. Consumers should pass their own icon URL.
   */
  icon?: string | false;
  /** Pattern for notification + in-page vibrate */
  vibrate?: number | number[];
  /** When visible: flash the screen (default true) */
  flash?: boolean;
  /** When visible: shake / vibrate (default true) */
  shake?: boolean;
  /** When visible: use alertCombo (default false); skips Notification.vibrate while visible to avoid double haptic */
  combo?: boolean;
  /** Shake / pulse target */
  shakeTarget?: Element | string | null;
  /** Keep notification until dismissed */
  requireInteraction?: boolean;
  /** Suppress notification sound/vibrate */
  silent?: boolean;
  /** Force show/hide Notification when visible (`undefined` = show if granted) */
  notification?: boolean;
  /** Passed through to visual helpers */
  reduceMotion?: boolean;
}

export interface NotifyAlertResult {
  permission: NotifyPermission | string;
  /**
   * Page `Notification` instance when using the page path; `null` when shown via
   * Service Worker `registration.showNotification` (or on failure / no-op).
   */
  notification: Notification | null;
  visibleCues: boolean;
}

/**
 * Resolve Notification icon: `false` / omitted / null / "" → undefined (no icon);
 * string → as-is. Consumers should pass an explicit icon URL when desired.
 */
export function resolveNotifyIcon(
  icon?: string | false | null
): string | undefined;

/** @returns whether the Notification API exists */
export function isNotificationSupported(): boolean;

/**
 * Current permission, or `"unsupported"` when the API is missing.
 */
export function getNotifyPermission(): NotifyPermission;

/**
 * Request Notification permission (must be called from a user gesture in most browsers).
 */
export function requestNotifyPermission(): Promise<NotifyPermission>;

/**
 * True when a controlling Service Worker is active (installed PWA / registered SW).
 * When true, `notifyAlert` prefers `registration.showNotification`.
 */
export function hasControllingServiceWorker(): boolean;

/**
 * Background / permission-based alert.
 * Prefers SW `showNotification` when a controlling SW exists; else page `Notification`.
 * When visible also flash / shake / combo.
 */
export function notifyAlert(
  title: string,
  opts?: NotifyAlertOptions
): Promise<NotifyAlertResult>;

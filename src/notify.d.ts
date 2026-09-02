/**
 * Permission-based Notification alerts with visual + haptic cues when the page is visible.
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
  /** Notification icon URL */
  icon?: string;
  /** Pattern for notification + in-page vibrate */
  vibrate?: number | number[];
  /** When visible: flash the screen (default true) */
  flash?: boolean;
  /** When visible: shake / vibrate (default true) */
  shake?: boolean;
  /** When visible: use alertCombo (default false) */
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
  notification: Notification | null;
  visibleCues: boolean;
}

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
 * Background / permission-based alert.
 * System Notification when permitted; when visible also flash / shake / combo.
 */
export function notifyAlert(
  title: string,
  opts?: NotifyAlertOptions
): Promise<NotifyAlertResult>;

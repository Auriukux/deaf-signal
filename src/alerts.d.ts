/**
 * Product-level alert presets (presentation only).
 * @module deaf-signal/alerts
 */

import type { AlertComboOptions, AlertComboResult, AlertLevel } from "./signals.js";
import type { NotifyAlertResult } from "./notify.js";

export interface AlertShakeOptions {
  durationMs?: number;
  amplitudePx?: number;
}

export interface AlertPreset {
  /** Canonical lowercase key */
  name: string;
  /** Default EN banner / notification title */
  message: string;
  /** Optional EN body for notifications */
  body?: string;
  level: AlertLevel;
  /** Explicit flash color */
  flashColor?: string;
  vibratePattern: number[];
  shake?: AlertShakeOptions;
  requireInteraction?: boolean;
}

export type AlertName =
  | "call"
  | "message"
  | "door"
  | "siren"
  | "horn"
  | "urgent";

export const ALERT_CALL: AlertPreset;
export const ALERT_MESSAGE: AlertPreset;
export const ALERT_DOOR: AlertPreset;
export const ALERT_SIREN: AlertPreset;
export const ALERT_HORN: AlertPreset;
export const ALERT_URGENT: AlertPreset;

/** Map of preset name -> alert definition */
export const ALERTS: Readonly<Record<AlertName, AlertPreset>>;

/**
 * Look up a named product alert preset.
 */
export function getAlert(
  name: AlertName | string | null | undefined
): AlertPreset | undefined;

export interface RunAlertOptions
  extends Omit<AlertComboOptions, "level" | "flashColor" | "vibratePattern"> {
  message?: string;
  body?: string;
  level?: AlertLevel | string;
  flashColor?: string | null;
  vibratePattern?: number | number[];
  /** Force/disable notify (default: notify when permission already granted) */
  notify?: boolean;
  tag?: string;
  requireInteraction?: boolean;
}

export interface RunAlertResult {
  alert: AlertPreset | null;
  combo: AlertComboResult | null;
  notification: NotifyAlertResult | null;
}

/**
 * Run a named product alert: alertCombo plus optional notifyAlert
 * when Notification permission is already granted.
 */
export function runAlert(
  name: AlertName | string,
  opts?: RunAlertOptions
): Promise<RunAlertResult>;

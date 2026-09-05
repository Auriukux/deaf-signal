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
  /** Banner auto-dismiss delay (ms); siren/horn longer */
  durationMs?: number;
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
 * Returns a copy (sliced vibratePattern + copied shake) so callers cannot mutate shared ALERT_*.
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
  /** Override preset shake opts passed to shakeElement */
  shake?: AlertShakeOptions | null;
  /** Banner duration override */
  durationMs?: number;
  /** Banner close button aria-label */
  closeLabel?: string;
  /** Opt-in system Notification (default `false`; pass `true` when permission granted) */
  notify?: boolean;
  tag?: string;
  requireInteraction?: boolean;
}

export interface RunAlertResult {
  alert: AlertPreset;
  combo: AlertComboResult;
  notification: NotifyAlertResult | null;
}

/** Cue vibration patterns (not detectors) — also on `deaf-signal/presets`. */
export const PATTERN_DOOR: readonly number[];
export const PATTERN_SIREN: readonly number[];
export const PATTERN_HORN: readonly number[];

/**
 * Run a named product alert: alertCombo plus optional notifyAlert.
 * Notify is **opt-in** via `{ notify: true }` (default false).
 * Unknown names: console.warn + returns false (fail-closed).
 */
export function runAlert(
  name: AlertName | string,
  opts?: RunAlertOptions
): Promise<RunAlertResult | false>;

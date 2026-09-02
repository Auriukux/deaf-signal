/**
 * deaf-signal — visual + haptic web alerts (no sound).
 * Accessibility helpers for deaf / hard-of-hearing users.
 */

export {
  flashScreen,
  showBanner,
  vibratePattern,
  alertCombo,
  pulseBorder,
  shakeElement,
  contrastFlashColor,
  isVibrateSupported,
} from "./signals.js";
export type {
  AlertLevel,
  FlashScreenOptions,
  ShowBannerOptions,
  ShakeElementOptions,
  VibratePatternOptions,
  PulseBorderOptions,
  AlertComboOptions,
  AlertComboResult,
} from "./signals.js";

export {
  PATTERN_CALL,
  PATTERN_MESSAGE,
  PATTERN_URGENT,
  PRESETS,
  getPreset,
} from "./presets.js";
export type { PresetName } from "./presets.js";

export {
  requestNotifyPermission,
  notifyAlert,
  isNotificationSupported,
  getNotifyPermission,
} from "./notify.js";
export type {
  NotifyPermission,
  NotificationUrgency,
  NotifyAlertOptions,
  NotifyAlertResult,
} from "./notify.js";

export {
  ALERT_CALL,
  ALERT_MESSAGE,
  ALERT_DOOR,
  ALERT_SIREN,
  ALERT_HORN,
  ALERT_URGENT,
  ALERTS,
  getAlert,
  runAlert,
} from "./alerts.js";
export type {
  AlertShakeOptions,
  AlertPreset,
  AlertName,
  RunAlertOptions,
  RunAlertResult,
} from "./alerts.js";

export {
  startLoudListen,
  stopLoudListen,
  isListenSupported,
  getInputLevel,
  DEFAULT_LOUD_THRESHOLD,
  DEFAULT_MIN_INTERVAL_MS,
} from "./listen.js";
export type {
  LoudEvent,
  StartLoudListenOptions,
  LoudListenController,
} from "./listen.js";


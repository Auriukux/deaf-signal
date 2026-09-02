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
  clampShakeAmplitude,
  SHAKE_AMPLITUDE_MIN,
  SHAKE_AMPLITUDE_MAX,
} from "./signals.js";

export {
  PATTERN_CALL,
  PATTERN_MESSAGE,
  PATTERN_URGENT,
  PRESETS,
  getPreset,
} from "./presets.js";

export {
  requestNotifyPermission,
  notifyAlert,
  isNotificationSupported,
  getNotifyPermission,
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

export {
  startLoudListen,
  stopLoudListen,
  isListenSupported,
  getInputLevel,
  DEFAULT_LOUD_THRESHOLD,
  DEFAULT_MIN_INTERVAL_MS,
  DEFAULT_LOUD_ALERT,
  resolveLoudAlertName,
} from "./listen.js";


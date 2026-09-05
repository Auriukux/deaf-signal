/**
 * deaf-signal — visual + haptic web alerts.
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
  clampFlashDuration,
  SHAKE_AMPLITUDE_MIN,
  SHAKE_AMPLITUDE_MAX,
  FLASH_DURATION_MAX,
  FLASH_RATE_MAX,
  FLASH_RATE_WINDOW_MS,
  FLASH_MIN_GAP_MS,
} from "./signals.js";

export {
  PATTERN_CALL,
  PATTERN_MESSAGE,
  PATTERN_URGENT,
  PATTERN_DOOR,
  PATTERN_SIREN,
  PATTERN_HORN,
  PRESETS,
  getPreset,
} from "./presets.js";

export {
  requestNotifyPermission,
  notifyAlert,
  isNotificationSupported,
  getNotifyPermission,
  hasControllingServiceWorker,
  resolveNotifyIcon,
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


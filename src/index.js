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

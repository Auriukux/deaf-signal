/**
 * Visual + haptic web alerts for deaf / hard-of-hearing accessibility.
 * Public barrel — implementation lives in flash / banner / motion / combo.
 * @module deaf-signal/signals
 */

export {
  flashScreen,
  contrastFlashColor,
  clampFlashDuration,
  settleFlashResolve,
  FLASH_DURATION_MAX,
  FLASH_RATE_MAX,
  FLASH_RATE_WINDOW_MS,
  FLASH_MIN_GAP_MS,
  resetFlashRateLimit,
  canStartFlash,
  noteFlashStart,
} from "./flash.js";

export {
  showBanner,
  defaultBannerCloseLabel,
} from "./banner.js";

export {
  shakeElement,
  vibratePattern,
  pulseBorder,
  isVibrateSupported,
  clampShakeAmplitude,
  SHAKE_AMPLITUDE_MIN,
  SHAKE_AMPLITUDE_MAX,
} from "./motion.js";

export { alertCombo } from "./combo.js";

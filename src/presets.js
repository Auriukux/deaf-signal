/**
 * Named vibration patterns for common alert kinds.
 * Units are milliseconds: vibrate, pause, vibrate, ...
 * These are **cue patterns** you play — not sound classifiers / detectors.
 * @module deaf-signal/presets
 */

/** Short double-pulse — incoming call / ring cue */
export const PATTERN_CALL = Object.freeze([300, 120, 300, 120, 300]);

/** Quick soft pulse — new message / notification */
export const PATTERN_MESSAGE = Object.freeze([100, 80, 100]);

/** Longer insistent pattern — urgent / alarm */
export const PATTERN_URGENT = Object.freeze([200, 80, 200, 80, 200, 80, 500]);

/** Door-knock style pulse (cue — not doorbell detection) */
export const PATTERN_DOOR = Object.freeze([180, 100, 180, 100, 180, 280, 400]);

/** Rapid siren-like pulse (cue — not siren classification) */
export const PATTERN_SIREN = Object.freeze([120, 60, 120, 60, 120, 60, 120, 60, 300]);

/** Sharp double-blast horn cue (not horn recognition) */
export const PATTERN_HORN = Object.freeze([450, 150, 450, 150, 600]);

/** Map of preset name -> pattern array (frozen; values are frozen arrays) */
export const PRESETS = Object.freeze({
  call: PATTERN_CALL,
  message: PATTERN_MESSAGE,
  urgent: PATTERN_URGENT,
  door: PATTERN_DOOR,
  siren: PATTERN_SIREN,
  horn: PATTERN_HORN,
});

/**
 * Look up a named preset pattern.
 * @param {"call"|"message"|"urgent"|"door"|"siren"|"horn"|string} name
 * @returns {number[]|undefined} mutable copy, or undefined when unknown
 */
export function getPreset(name) {
  if (name == null) return undefined;
  const pattern = PRESETS[String(name).toLowerCase()];
  // Return a copy so callers cannot mutate shared PATTERN_* arrays
  return pattern ? pattern.slice() : undefined;
}

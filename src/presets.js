/**
 * Named vibration patterns for common alert kinds.
 * Units are milliseconds: vibrate, pause, vibrate, ...
 * @module deaf-signal/presets
 */

/** Short double-pulse — incoming call / ring cue */
export const PATTERN_CALL = [300, 120, 300, 120, 300];

/** Quick soft pulse — new message / notification */
export const PATTERN_MESSAGE = [100, 80, 100];

/** Longer insistent pattern — urgent / alarm */
export const PATTERN_URGENT = [200, 80, 200, 80, 200, 80, 500];

/** Map of preset name -> pattern array */
export const PRESETS = {
  call: PATTERN_CALL,
  message: PATTERN_MESSAGE,
  urgent: PATTERN_URGENT,
};

/**
 * Look up a named preset pattern.
 * @param {"call"|"message"|"urgent"|string} name
 * @returns {number[]|undefined}
 */
export function getPreset(name) {
  if (name == null) return undefined;
  const pattern = PRESETS[String(name).toLowerCase()];
  // Return a copy so callers cannot mutate shared PATTERN_* arrays
  return pattern ? pattern.slice() : undefined;
}

/**
 * Named vibration patterns for common alert kinds.
 * Units are milliseconds: vibrate, pause, vibrate, ...
 * These are **cue patterns** you play — not sound classifiers / detectors.
 * @module deaf-signal/presets
 */

/** Short double-pulse — incoming call / ring cue */
export const PATTERN_CALL: readonly number[];

/** Quick soft pulse — new message / notification */
export const PATTERN_MESSAGE: readonly number[];

/** Longer insistent pattern — urgent / alarm */
export const PATTERN_URGENT: readonly number[];

/** Door-knock style pulse (cue — not doorbell detection) */
export const PATTERN_DOOR: readonly number[];

/** Rapid siren-like pulse (cue — not siren classification) */
export const PATTERN_SIREN: readonly number[];

/** Sharp double-blast horn cue (not horn recognition) */
export const PATTERN_HORN: readonly number[];

export type PresetName =
  | "call"
  | "message"
  | "urgent"
  | "door"
  | "siren"
  | "horn";

/** Map of preset name -> pattern array (frozen) */
export const PRESETS: Readonly<Record<PresetName, readonly number[]>>;

/**
 * Look up a named preset pattern.
 * @returns a mutable copy of the pattern array, or undefined when unknown
 */
export function getPreset(name: PresetName | string | null | undefined): number[] | undefined;

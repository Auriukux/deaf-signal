/**
 * Named vibration patterns for common alert kinds.
 * Units are milliseconds: vibrate, pause, vibrate, ...
 * @module deaf-signal/presets
 */

/** Short double-pulse — incoming call / ring cue */
export const PATTERN_CALL: number[];

/** Quick soft pulse — new message / notification */
export const PATTERN_MESSAGE: number[];

/** Longer insistent pattern — urgent / alarm */
export const PATTERN_URGENT: number[];

export type PresetName = "call" | "message" | "urgent";

/** Map of preset name -> pattern array */
export const PRESETS: Readonly<Record<PresetName, number[]>>;

/**
 * Look up a named preset pattern.
 * @returns a copy of the pattern array, or undefined when unknown
 */
export function getPreset(name: PresetName | string | null | undefined): number[] | undefined;

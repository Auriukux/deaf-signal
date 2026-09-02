/**
 * Optional microphone loud-sound detection (Web Audio only — no ML / cloud).
 * High RMS threshold by design: quiet rooms and soft speech should NOT fire;
 * intended for door slam / shout / nearby siren-level peaks.
 * @module deaf-signal/listen
 */

/** Default RMS threshold (0–1). Strong sounds only. */
export const DEFAULT_LOUD_THRESHOLD: number;

/** Default cooldown between loud triggers (ms). */
export const DEFAULT_MIN_INTERVAL_MS: number;

export interface LoudEvent {
  /** Same as rms (0–1), convenient for meters */
  level: number;
  /** Root-mean-square of normalised time-domain samples */
  rms: number;
}

export interface StartLoudListenOptions {
  /** RMS 0–1; default DEFAULT_LOUD_THRESHOLD (high bar) */
  threshold?: number;
  /** Cooldown between fires; default 2500 */
  minIntervalMs?: number;
  /** Called when threshold is exceeded */
  onLoud?: (ev: LoudEvent) => void;
  /** Optional live meter callback (~50–100ms) */
  onLevel?: (level: number) => void;
  /**
   * Auto `runAlert` name; default `"urgent"`.
   * Pass `false` to skip product alerts.
   */
  alert?: "urgent" | "siren" | false | string;
  /**
   * If true and Notification already granted, also notify when `alert` is false.
   * When `alert` runs, `runAlert` already notifies if permission is granted.
   */
  notify?: boolean;
  /** Extra opts forwarded to `runAlert` */
  alertOpts?: Record<string, unknown>;
}

export interface LoudListenController {
  /** Stop listening; release mic + AudioContext */
  stop(): void;
  /** Current RMS while running, else null */
  getInputLevel(): number | null;
  active: boolean;
}

/** @returns whether getUserMedia + AudioContext are available */
export function isListenSupported(): boolean;

/** Current input RMS while a listen session is active, else `null`. */
export function getInputLevel(): number | null;

/** Stop the active loud-listen session (if any). */
export function stopLoudListen(): void;

/**
 * Start microphone loud-sound detection.
 * Requires a secure context (HTTPS / localhost) and mic permission.
 */
export function startLoudListen(
  opts?: StartLoudListenOptions
): Promise<LoudListenController>;

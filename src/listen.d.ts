/**
 * Optional microphone loud-sound detection (Web Audio only — no ML / cloud).
 * High RMS threshold by design: quiet rooms and soft speech should NOT fire.
 * RMS loudness ≠ siren / door / horn classification — peaks only, not event type.
 * Active sessions auto-stop on pagehide / beforeunload (and explicit stop()).
 * Visibility hidden does NOT stop by default (`stopOnHidden: false` is a preference,
 * not a contract): background listening is best-effort — browsers may suspend AudioContext.
 * @module deaf-signal/listen
 */

/** Default RMS threshold (0–1). Strong loudness peaks only (0.25). */
export const DEFAULT_LOUD_THRESHOLD: number;

/** Default cooldown between loud triggers (ms). */
export const DEFAULT_MIN_INTERVAL_MS: number;

/** Default product alert when loud peak fires (`"urgent"`). */
export const DEFAULT_LOUD_ALERT: "urgent";

export interface LoudEvent {
  /** Same as rms (0–1), convenient for meters */
  level: number;
  /** Root-mean-square of normalised time-domain samples */
  rms: number;
}

export interface StartLoudListenOptions {
  /** RMS 0–1; default DEFAULT_LOUD_THRESHOLD (0.25) */
  threshold?: number;
  /** Cooldown between fires; default 2500 */
  minIntervalMs?: number;
  /** Called when threshold is exceeded */
  onLoud?: (ev: LoudEvent) => void;
  /** Optional live meter callback (~50–100ms) */
  onLevel?: (level: number) => void;
  /**
   * Auto `runAlert` name for a **loudPeak** cue; default `"urgent"` (neutral).
   * Product event names (`siren` / `door` / `horn` / …) remap to `"urgent"`;
   * unknown names skip the alert (`null`) — mic RMS is not a classifier.
   * Pass `false` for callback-only (`onLoud` / `notify`).
   */
  alert?: "urgent" | false | string;
  /**
   * If true and Notification already granted, also notify when `alert` is false.
   * When `alert` runs, `runAlert` already notifies if permission is granted.
   */
  notify?: boolean;
  /** Extra opts forwarded to `runAlert` */
  alertOpts?: Record<string, unknown>;
  /**
   * If true, also stop when `visibilitychange` → hidden.
   * Default false — prefer keeping the session while backgrounded (best-effort;
   * browsers may still suspend AudioContext / throttle timers). Not a guarantee.
   */
  stopOnHidden?: boolean;
  /** Called once when the session stops (explicit stop, unload, or stopOnHidden) */
  onStop?: () => void;
}

export interface LoudListenController {
  /** Stop listening; release mic + AudioContext */
  stop(): void;
  /** Current RMS while running, else null */
  getInputLevel(): number | null;
  active: boolean;
}

/** Resolve loudPeak alert name (`false` / unknown → null; default / product → `"urgent"`). */
export function resolveLoudAlertName(
  alert?: StartLoudListenOptions["alert"] | null
): string | null;

/** @returns whether getUserMedia + AudioContext are available */
export function isListenSupported(): boolean;

/** Current input RMS while a listen session is active, else `null`. */
export function getInputLevel(): number | null;

/** Stop the active loud-listen session (if any) and abort in-flight starts. */
export function stopLoudListen(): void;

/**
 * Start microphone loud-sound detection.
 * Requires a secure context (HTTPS / localhost) and mic permission.
 * A second call aborts any in-flight first start.
 * Auto-stops on pagehide / beforeunload (not on visibility hidden unless stopOnHidden).
 * Background-tab listening with `stopOnHidden: false` is best-effort only.
 */
export function startLoudListen(
  opts?: StartLoudListenOptions
): Promise<LoudListenController>;

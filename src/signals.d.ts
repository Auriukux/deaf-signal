/**
 * Visual + haptic web alerts for deaf / hard-of-hearing accessibility.
 * @module deaf-signal/signals
 */

export type AlertLevel = "info" | "warn" | "urgent";

/** Min shake amplitude clamp (px). */
export const SHAKE_AMPLITUDE_MIN: 2;
/** Max shake amplitude clamp (px). */
export const SHAKE_AMPLITUDE_MAX: 64;

/** Clamp shake amplitude to 2–64 (default 16). */
export function clampShakeAmplitude(amplitudePx?: unknown): number;

/**
 * Immediately invoke a previous flashScreen resolve (if any).
 * Used so overlapping flashes never leave the first Promise hanging.
 */
export function settleFlashResolve(
  previousResolve: (() => void) | null | undefined
): null;

/** Default banner close aria-label from `<html lang>` (`lt*` → "Uždaryti"). */
export function defaultBannerCloseLabel(): string;

/** Max full flashes allowed inside the sliding window (WCAG-minded: < 3/s). */
export const FLASH_RATE_MAX: 2;
/** Sliding window for flash rate limiting (ms). */
export const FLASH_RATE_WINDOW_MS: 1000;
/** Minimum gap between flash starts (ms). */
export const FLASH_MIN_GAP_MS: 400;

/**
 * Reset the shared flash rate-limit window.
 * Test / long-page helper — available via `deaf-signal/signals`, not the package root.
 */
export function resetFlashRateLimit(): void;

/**
 * Whether a new full flash may start without exceeding the rate limit (pure query).
 * Test helper — available via `deaf-signal/signals`, not the package root.
 */
export function canStartFlash(now?: number): boolean;

/**
 * Record a flash start for the shared rate limiter (call only when a flash begins).
 * Test helper — available via `deaf-signal/signals`, not the package root.
 */
export function noteFlashStart(now?: number): void;


export interface FlashScreenOptions {
  /** Overlay background color (auto contrast when omitted) */
  color?: string | null;
  /** How long the flash stays visible (default 400) */
  durationMs?: number;
  /** Overlay opacity clamped to 0–1 (default 0.55) */
  opacity?: number;
  /** Force skip/respect reduced motion (default: OS preference) */
  reduceMotion?: boolean;
}

export interface ShowBannerOptions {
  /** Visual severity (default "info") */
  level?: AlertLevel;
  /** Auto-dismiss delay; 0 = stay until closed (default 3000) */
  durationMs?: number;
  /** Close button aria-label (default from html lang: lt* → "Uždaryti", else "Close") */
  closeLabel?: string;
}

export interface ShakeElementOptions {
  /** Total shake duration in ms (default 550) */
  durationMs?: number;
  /** Max horizontal offset in px (default 16; clamped 2–64) */
  amplitudePx?: number;
  /** Force skip/respect reduced motion */
  reduceMotion?: boolean;
}

export interface VibratePatternOptions {
  /** Always run visual shake in addition to vibrate (default true) */
  shakeFallback?: boolean;
  /** Shake target (default: main, then body) */
  target?: Element | string | null;
  /** Passed through to shakeElement */
  reduceMotion?: boolean;
  /** Shake duration (ms) */
  durationMs?: number;
  /** Shake amplitude (px) */
  amplitudePx?: number;
}

export interface PulseBorderOptions {
  /** Border / outline color (default "#ff9800") */
  color?: string;
  /** Number of pulse cycles (default 3) */
  times?: number;
  /** Total animation duration (default 900) */
  durationMs?: number;
  /** Force skip/respect reduced motion (default: OS preference) */
  reduceMotion?: boolean;
}

export interface AlertComboOptions {
  flash?: boolean;
  banner?: boolean;
  vibrate?: boolean;
  /** Default "warn" */
  level?: AlertLevel;
  /** Explicit flash color; omit for urgent red / auto contrast */
  flashColor?: string | null;
  vibratePattern?: number | number[];
  /** Default true */
  shakeFallback?: boolean;
  shakeTarget?: Element | string | null;
  /** Passed through to shakeElement via vibratePattern */
  shake?: { durationMs?: number; amplitudePx?: number } | null;
  /** Banner auto-dismiss delay (ms) */
  durationMs?: number;
  /** Banner close button aria-label */
  closeLabel?: string;
  /** Force skip/respect reduced motion for flash/shake */
  reduceMotion?: boolean;
}

export interface AlertComboResult {
  banner: HTMLElement | null;
  vibrated: boolean;
}

/**
 * Pick a high-contrast flash color from page / body background luminance.
 * Dark backgrounds → white; light → near-black.
 */
export function contrastFlashColor(root?: Element | string | null): string;

/** True when the Vibration API is available. */
export function isVibrateSupported(): boolean;

/**
 * Briefly flash the viewport with a solid overlay color.
 * When `color` is omitted, picks contrast via {@link contrastFlashColor}.
 * Overlapping calls reuse one overlay and immediately resolve the prior Promise.
 * Rate-limited for photosensitivity (shared with alertCombo).
 */
export function flashScreen(opts?: FlashScreenOptions): Promise<void>;

/** Show a high-contrast banner message at the top of the page. */
export function showBanner(
  message: string,
  opts?: ShowBannerOptions
): Promise<HTMLElement | null>;

/**
 * Visual shake via CSS @keyframes / Web Animations.
 * Overlapping calls on the same element abort the prior shake; the prior
 * Promise resolves `false`. A finished cue resolves `true`.
 * @returns `true` if this call's cue finished; `false` if skipped or aborted by overlap
 */
export function shakeElement(
  target: Element | string,
  opts?: ShakeElementOptions
): Promise<boolean>;

/**
 * Trigger a vibration pattern when available; with shakeFallback (default),
 * also always runs visual {@link shakeElement}.
 * @returns true if vibrate was attempted OR shake fallback was started
 */
export function vibratePattern(
  pattern?: number | number[],
  opts?: VibratePatternOptions
): boolean;

/** Pulse an element's border to draw visual attention. */
export function pulseBorder(
  target: Element | string,
  opts?: PulseBorderOptions
): Promise<void>;

/**
 * Combined alert: optional flash + banner + vibrate (with shake fallback).
 * Urgent flash is always `#e53935` when `flashColor` is omitted.
 */
export function alertCombo(
  message: string,
  opts?: AlertComboOptions
): Promise<AlertComboResult>;

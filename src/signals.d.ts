/**
 * Visual + haptic web alerts (no sound) for deaf / hard-of-hearing accessibility.
 * @module deaf-signal/signals
 */

export type AlertLevel = "info" | "warn" | "urgent";

export interface FlashScreenOptions {
  /** Overlay background color (auto contrast when omitted) */
  color?: string | null;
  /** How long the flash stays visible (default 400) */
  durationMs?: number;
  /** Overlay opacity 0–1 (default 0.55) */
  opacity?: number;
  /** Force skip/respect reduced motion (default: OS preference) */
  reduceMotion?: boolean;
}

export interface ShowBannerOptions {
  /** Visual severity (default "info") */
  level?: AlertLevel;
  /** Auto-dismiss delay; 0 = stay until closed (default 3000) */
  durationMs?: number;
}

export interface ShakeElementOptions {
  /** Total shake duration in ms (default 550) */
  durationMs?: number;
  /** Max horizontal offset in px (default 16; clamped ~14–18) */
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
 */
export function flashScreen(opts?: FlashScreenOptions): Promise<void>;

/** Show a high-contrast banner message at the top of the page. */
export function showBanner(
  message: string,
  opts?: ShowBannerOptions
): Promise<HTMLElement | null>;

/**
 * Visual shake via CSS @keyframes / Web Animations.
 * @returns true if a visual cue ran
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

/** Pulse an element's border to draw attention without sound. */
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

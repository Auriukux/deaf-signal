/**
 * Visual + haptic web alerts for deaf / hard-of-hearing accessibility.
 * @module deaf-signal/signals
 */

const DEFAULT_FLASH_MS = 400;
const DEFAULT_BANNER_MS = 3000;
const DEFAULT_SHAKE_MS = 550;

/** Min/max shake amplitude (px) — honest API range. */
export const SHAKE_AMPLITUDE_MIN = 2;
export const SHAKE_AMPLITUDE_MAX = 64;

/**
 * Clamp shake amplitude to a reasonable range (default 16).
 * @param {unknown} amplitudePx
 * @returns {number}
 */
export function clampShakeAmplitude(amplitudePx) {
  const n = Number(amplitudePx);
  const v = Number.isFinite(n) ? n : 16;
  return Math.max(SHAKE_AMPLITUDE_MIN, Math.min(SHAKE_AMPLITUDE_MAX, v));
}

/**
 * Whether the user (or caller) prefers reduced motion.
 * Explicit `reduceMotion` wins; otherwise checks `prefers-reduced-motion`.
 * @param {boolean} [explicit]
 * @returns {boolean}
 */
function shouldReduceMotion(explicit) {
  if (explicit === true) return true;
  if (explicit === false) return false;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Resolve an Element from a selector string or Element.
 * @param {Element|string|null|undefined} target
 * @returns {Element|null}
 */
function resolveElement(target) {
  if (typeof document === "undefined") return null;
  if (target == null) return null;
  if (typeof target === "string") {
    try {
      return document.querySelector(target);
    } catch {
      return null;
    }
  }
  return target instanceof Element ? target : null;
}

/**
 * Parse a CSS color string to RGB components (0–255).
 * @param {string} color
 * @returns {{r:number,g:number,b:number}|null}
 */
function parseCssColor(color) {
  if (!color || typeof color !== "string") return null;
  const c = color.trim().toLowerCase();
  if (c === "transparent" || c === "rgba(0, 0, 0, 0)") return null;

  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      h = h
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  const rgb = c.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/
  );
  if (rgb) {
    const a = rgb[4] !== undefined ? Number(rgb[4]) : 1;
    if (a === 0) return null;
    return {
      r: Math.min(255, Math.round(Number(rgb[1]))),
      g: Math.min(255, Math.round(Number(rgb[2]))),
      b: Math.min(255, Math.round(Number(rgb[3]))),
    };
  }

  // Off-DOM: Canvas 2D fillStyle normalizes named / system colors without
  // inserting a probe into document.body (avoids lasting nodes / MutationObserver noise).
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext && canvas.getContext("2d");
      if (ctx) {
        const sentinel = "#abcdef";
        ctx.fillStyle = sentinel;
        ctx.fillStyle = c;
        const computed = String(ctx.fillStyle || "");
        // Invalid colors leave the previous fillStyle unchanged
        if (computed && computed !== sentinel && computed !== c) {
          return parseCssColor(computed);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Relative luminance (WCAG) for sRGB 0–255 channels.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number}
 */
function relativeLuminance(r, g, b) {
  const toLinear = (channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Walk ancestors for a usable opaque background color.
 * @param {Element|null} start
 * @returns {{r:number,g:number,b:number}|null}
 */
function sampleBackgroundRgb(start) {
  if (typeof document === "undefined" || !start) return null;
  let el = start;
  while (el && el instanceof Element) {
    try {
      const bg = getComputedStyle(el).backgroundColor;
      const rgb = parseCssColor(bg);
      if (rgb) return rgb;
    } catch {
      /* ignore */
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * Pick a high-contrast flash color from page / body background luminance.
 * Dark backgrounds → white; light → near-black.
 * @param {Element|string} [root] Element or selector to sample (default: body)
 * @returns {string} CSS color `#ffffff` or `#111111`
 */
export function contrastFlashColor(root) {
  const el =
    resolveElement(root) ||
    (typeof document !== "undefined" ? document.body : null) ||
    (typeof document !== "undefined" ? document.documentElement : null);

  const rgb = sampleBackgroundRgb(el) || { r: 15, g: 20, b: 25 };
  const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
  return lum < 0.45 ? "#ffffff" : "#111111";
}

/**
 * True when the Vibration API is available (call still needs a user gesture on many browsers).
 * @returns {boolean}
 */
export function isVibrateSupported() {
  return (
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
  );
}

/** @type {HTMLElement|null} */
let sharedFlashOverlay = null;
/** @type {number|null} */
let sharedFlashHideTimer = null;
/** @type {number|null} */
let sharedFlashRemoveTimer = null;
/** @type {(() => void)|null} Resolve for the in-flight flashScreen Promise */
let sharedFlashResolve = null;

function clearSharedFlashTimers() {
  if (sharedFlashHideTimer != null) {
    clearTimeout(sharedFlashHideTimer);
    sharedFlashHideTimer = null;
  }
  if (sharedFlashRemoveTimer != null) {
    clearTimeout(sharedFlashRemoveTimer);
    sharedFlashRemoveTimer = null;
  }
}

/**
 * Immediately resolve any pending flashScreen Promise, then clear its timers.
 * A second flash used to only clear timers — the first `await` hung forever.
 * @param {(() => void)|null} previousResolve
 * @returns {null} always clears the stored resolve
 */
export function settleFlashResolve(previousResolve) {
  if (typeof previousResolve === "function") previousResolve();
  return null;
}

/**
 * Photosensitivity: WCAG-minded flash rate limit (shared by flashScreen / alertCombo).
 * Prevent ≥3 full flashes per second — allow at most {@link FLASH_RATE_MAX} starts
 * inside {@link FLASH_RATE_WINDOW_MS}, with a minimum gap of {@link FLASH_MIN_GAP_MS}.
 */
export const FLASH_RATE_MAX = 2;
/** Sliding window for counting full flashes (ms). */
export const FLASH_RATE_WINDOW_MS = 1000;
/** Minimum gap between flash starts (ms). */
export const FLASH_MIN_GAP_MS = 400;

/** @type {number[]} recent flash start timestamps (ms) */
let flashStartTimestamps = [];

/**
 * Reset the shared flash rate-limit window (tests / long-running pages).
 */
export function resetFlashRateLimit() {
  flashStartTimestamps = [];
}

/**
 * Whether a new full flash may start now without exceeding the rate limit.
 * Pure query — does not mutate the rate-limit window (use {@link noteFlashStart}
 * only when a flash actually begins).
 * @param {number} [now=Date.now()]
 * @returns {boolean}
 */
export function canStartFlash(now = Date.now()) {
  const t = Number(now);
  const at = Number.isFinite(t) ? t : Date.now();
  const recent = flashStartTimestamps.filter(
    (ts) => at - ts < FLASH_RATE_WINDOW_MS
  );
  if (recent.length >= FLASH_RATE_MAX) return false;
  const last = recent[recent.length - 1];
  if (last != null && at - last < FLASH_MIN_GAP_MS) return false;
  return true;
}

/**
 * Record a flash start for the shared rate limiter (call only when a flash actually begins).
 * @param {number} [now=Date.now()]
 */
export function noteFlashStart(now = Date.now()) {
  const t = Number(now);
  const at = Number.isFinite(t) ? t : Date.now();
  flashStartTimestamps = flashStartTimestamps.filter(
    (ts) => at - ts < FLASH_RATE_WINDOW_MS
  );
  flashStartTimestamps.push(at);
}

/**
 * Reuse / replace a single viewport flash overlay (never stack multiple flashes).
 */
function ensureSharedFlashOverlay() {
  if (typeof document === "undefined") return null;
  if (sharedFlashOverlay && sharedFlashOverlay.isConnected) {
    return sharedFlashOverlay;
  }
  const el = document.createElement("div");
  el.id = "deaf-signal-flash";
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483646",
    transition: "opacity 120ms ease-out",
  });
  document.body.appendChild(el);
  sharedFlashOverlay = el;
  return el;
}

/**
 * Briefly flash the viewport with a solid overlay color.
 * Overlapping calls reuse one overlay: the previous Promise is resolved
 * immediately so `await flashScreen()` never hangs.
 * Rate-limited for photosensitivity (max ~2 full flashes / 1s; shared with alertCombo).
 * When `color` is omitted, picks contrast via {@link contrastFlashColor}.
 * @param {object} [opts]
 * @param {string} [opts.color]
 * @param {number} [opts.durationMs]
 * @param {number} [opts.opacity] Overlay opacity clamped to 0–1 (default 0.55)
 * @param {boolean} [opts.reduceMotion]
 * @returns {Promise<void>}
 */
export function flashScreen(opts = {}) {
  const {
    durationMs = DEFAULT_FLASH_MS,
    reduceMotion: reduceMotionOpt,
  } = opts;
  const rawOpacity = opts.opacity;
  const opacityNum =
    typeof rawOpacity === "number" && Number.isFinite(rawOpacity)
      ? rawOpacity
      : 0.55;
  /** Clamp opacity to 0–1 (invalid / omitted → 0.55). */
  const opacity = Math.min(1, Math.max(0, opacityNum));
  const color =
    opts.color !== undefined && opts.color !== null
      ? opts.color
      : contrastFlashColor();

  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve();
      return;
    }
    if (shouldReduceMotion(reduceMotionOpt)) {
      resolve();
      return;
    }

    // Shared photosensitivity cooldown (also covers alertCombo → flashScreen)
    if (!canStartFlash()) {
      resolve();
      return;
    }

    // Settle any in-flight flash before clearing timers / reusing overlay
    sharedFlashResolve = settleFlashResolve(sharedFlashResolve);
    clearSharedFlashTimers();

    const el = ensureSharedFlashOverlay();
    if (!el) {
      resolve();
      return;
    }

    noteFlashStart();
    sharedFlashResolve = resolve;
    el.style.background = color;
    el.style.opacity = String(opacity);
    el.style.transition = "opacity 120ms ease-out";
    sharedFlashHideTimer = window.setTimeout(() => {
      el.style.opacity = "0";
      sharedFlashRemoveTimer = window.setTimeout(() => {
        if (sharedFlashOverlay === el) {
          el.remove();
          sharedFlashOverlay = null;
        }
        if (sharedFlashResolve === resolve) {
          sharedFlashResolve = null;
          resolve();
        }
      }, 140);
    }, durationMs);
  });
}

/**
 * Default banner close aria-label from `<html lang>` (`lt*` → "Uždaryti", else "Close").
 * Demo / callers can still pass `closeLabel` to override.
 * @returns {string}
 */
export function defaultBannerCloseLabel() {
  if (typeof document !== "undefined") {
    try {
      const lang = String(document.documentElement?.lang || "").toLowerCase();
      if (lang.startsWith("lt")) return "Uždaryti";
    } catch {
      /* ignore */
    }
  }
  return "Close";
}

/**
 * Show a high-contrast banner message at the top of the page.
 * @param {string} message Text to display
 * @param {object} [opts]
 * @param {"info"|"warn"|"urgent"} [opts.level="info"] Visual severity
 * @param {number} [opts.durationMs=3000] Auto-dismiss delay (0 = stay until closed)
 * @param {string} [opts.closeLabel] Close button aria-label (defaults via {@link defaultBannerCloseLabel})
 * @returns {Promise<HTMLElement|null>} The banner element (null without document)
 */
/** @type {number|null} Auto-dismiss timer for the active banner (cleared on early close) */
let bannerAutoDismissTimer = null;

function clearBannerAutoDismissTimer() {
  if (bannerAutoDismissTimer != null) {
    try {
      window.clearTimeout(bannerAutoDismissTimer);
    } catch {
      /* ignore */
    }
    bannerAutoDismissTimer = null;
  }
}

export function showBanner(message, opts = {}) {
  const {
    level = "info",
    durationMs = DEFAULT_BANNER_MS,
    closeLabel = defaultBannerCloseLabel(),
  } = opts;

  const palette = {
    info: { bg: "#1565c0", fg: "#ffffff" },
    warn: { bg: "#f9a825", fg: "#1a1a1a" },
    urgent: { bg: "#c62828", fg: "#ffffff" },
  };
  const colors = palette[level] || palette.info;

  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }

    // Replace prior banner and drop its auto-dismiss timer (no leak)
    clearBannerAutoDismissTimer();
    const existing = document.getElementById("deaf-signal-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "deaf-signal-banner";
    // role=alert implies assertive live region — do not also set aria-live
    banner.setAttribute("role", "alert");
    Object.assign(banner.style, {
      position: "fixed",
      top: "env(safe-area-inset-top, 0px)",
      left: "0",
      right: "0",
      padding: "14px max(48px, env(safe-area-inset-right, 0px)) 14px max(16px, env(safe-area-inset-left, 0px))",
      background: colors.bg,
      color: colors.fg,
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      fontWeight: "600",
      lineHeight: "1.4",
      zIndex: "2147483647",
      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      boxSizing: "border-box",
    });
    banner.textContent = message;

    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", String(closeLabel || defaultBannerCloseLabel()));
    close.textContent = "×";
    Object.assign(close.style, {
      position: "absolute",
      top: "0",
      right: "0",
      background: "transparent",
      border: "none",
      color: colors.fg,
      fontSize: "24px",
      cursor: "pointer",
      lineHeight: "1",
      // ~44px touch target (WCAG / mobile)
      minWidth: "44px",
      minHeight: "44px",
      padding: "10px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      boxSizing: "border-box",
    });

    const dismiss = () => {
      clearBannerAutoDismissTimer();
      if (banner.isConnected) banner.remove();
    };
    close.addEventListener("click", dismiss);
    banner.appendChild(close);
    document.body.appendChild(banner);

    if (durationMs > 0) {
      bannerAutoDismissTimer = window.setTimeout(dismiss, durationMs);
    }
    resolve(banner);
  });
}

const SHAKE_STYLE_ID = "deaf-signal-shake-style";
/** @type {WeakMap<Element, () => void>} Abort prior shake on the same element */
const activeShakeAbort = new WeakMap();
/** @type {WeakMap<Element, () => void>} Abort prior pulseBorder on the same element */
const activePulseAbort = new WeakMap();

/**
 * Ensure the shared CSS @keyframes for visual shake are present once.
 */
function ensureShakeKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SHAKE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SHAKE_STYLE_ID;
  style.textContent = `
@keyframes deaf-signal-shake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  12% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * -1)) rotate(-1.2deg); }
  24% { transform: translateX(var(--deaf-shake-amp, 16px)) rotate(1.2deg); }
  36% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * -0.85)) rotate(-0.9deg); }
  48% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * 0.85)) rotate(0.9deg); }
  60% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * -0.55)) rotate(-0.5deg); }
  72% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * 0.55)) rotate(0.5deg); }
  84% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * -0.25)) rotate(-0.2deg); }
}
`.trim();
  document.head.appendChild(style);
}

/**
 * Visual shake (drebėjimas) via CSS @keyframes / Web Animations.
 * Much more visible than tiny step transforms — default amplitude ~16px with slight rotate.
 * Honors `prefers-reduced-motion` / `opts.reduceMotion` with a brief opacity pulse only.
 * Starting a new shake on the same element cancels/replaces any prior WAAPI/CSS shake.
 * The aborted prior Promise resolves `false` (overlap abort); a completed cue resolves `true`.
 * Cleans up animation and inline styles afterward.
 * @param {Element|string} target Element or CSS selector
 * @param {object} [opts]
 * @param {number} [opts.durationMs=550] Total shake duration (~500–600ms)
 * @param {number} [opts.amplitudePx=16] Max horizontal offset in px (clamped 2–64)
 * @param {boolean} [opts.reduceMotion] Force skip/respect reduced motion
 * @returns {Promise<boolean>} `true` if this call's visual cue finished; `false` if skipped
 *   (no element / no document) or aborted by a newer overlapping shake on the same element
 */
export function shakeElement(target, opts = {}) {
  const {
    durationMs = DEFAULT_SHAKE_MS,
    amplitudePx = 16,
    reduceMotion: reduceMotionOpt,
  } = opts;

  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }
    const el = resolveElement(target);
    if (!el) {
      resolve(false);
      return;
    }

    // Cancel/replace any in-flight shake on this element
    const prevAbort = activeShakeAbort.get(el);
    if (prevAbort) {
      try {
        prevAbort();
      } catch {
        /* ignore */
      }
      activeShakeAbort.delete(el);
    }

    const prevTransform = el.style.transform;
    const prevTransition = el.style.transition;
    const prevOpacity = el.style.opacity;
    const prevWillChange = el.style.willChange;
    const prevAnimation = el.style.animation;
    const prevAmp = el.style.getPropertyValue("--deaf-shake-amp");

    /** @type {Animation|null} */
    let waapiAnim = null;
    /** @type {number[]} */
    const timers = [];
    /** @type {((ev?: Event) => void)|null} */
    let onEnd = null;

    const cleanup = () => {
      if (onEnd) {
        el.removeEventListener("animationend", onEnd);
        onEnd = null;
      }
      for (const id of timers) window.clearTimeout(id);
      timers.length = 0;
      if (waapiAnim) {
        try {
          waapiAnim.cancel();
        } catch {
          /* ignore */
        }
        waapiAnim = null;
      }
      el.style.transform = prevTransform;
      el.style.transition = prevTransition;
      el.style.opacity = prevOpacity;
      el.style.willChange = prevWillChange;
      el.style.animation = prevAnimation;
      if (prevAmp) {
        el.style.setProperty("--deaf-shake-amp", prevAmp);
      } else {
        el.style.removeProperty("--deaf-shake-amp");
      }
    };

    let done = false;
    const finish = (ran) => {
      if (done) return;
      done = true;
      if (activeShakeAbort.get(el) === abort) {
        activeShakeAbort.delete(el);
      }
      cleanup();
      resolve(ran);
    };

    const abort = () => {
      // Prior shake replaced — resolve false without leaving styles behind
      finish(false);
    };
    activeShakeAbort.set(el, abort);

    if (shouldReduceMotion(reduceMotionOpt)) {
      // Opacity pulse only — no heavy shake
      el.style.transition = "opacity 80ms ease";
      el.style.opacity = "0.45";
      timers.push(
        window.setTimeout(() => {
          el.style.opacity = prevOpacity || "1";
          timers.push(
            window.setTimeout(() => {
              finish(true);
            }, 100)
          );
        }, Math.min(180, durationMs))
      );
      return;
    }

    ensureShakeKeyframes();
    const amp = clampShakeAmplitude(amplitudePx);
    el.style.setProperty("--deaf-shake-amp", `${amp}px`);
    el.style.willChange = "transform";
    el.style.transition = "none";

    // Prefer Web Animations API when available (same keyframes, reliable cleanup)
    if (typeof el.animate === "function") {
      const a = amp;
      waapiAnim = el.animate(
        [
          { transform: "translateX(0) rotate(0deg)" },
          { transform: `translateX(${-a}px) rotate(-1.2deg)` },
          { transform: `translateX(${a}px) rotate(1.2deg)` },
          { transform: `translateX(${-a * 0.85}px) rotate(-0.9deg)` },
          { transform: `translateX(${a * 0.85}px) rotate(0.9deg)` },
          { transform: `translateX(${-a * 0.55}px) rotate(-0.5deg)` },
          { transform: `translateX(${a * 0.55}px) rotate(0.5deg)` },
          { transform: `translateX(${-a * 0.25}px) rotate(-0.2deg)` },
          { transform: "translateX(0) rotate(0deg)" },
        ],
        {
          duration: durationMs,
          easing: "ease-in-out",
          fill: "none",
        }
      );
      waapiAnim.onfinish = () => finish(true);
      // oncancel used when we abort via anim.cancel() in cleanup — finish already guards
      waapiAnim.oncancel = () => {
        /* abort path calls finish(false) directly */
      };
      return;
    }

    el.style.animation = `deaf-signal-shake ${durationMs}ms ease-in-out 1`;
    onEnd = () => {
      finish(true);
    };
    el.addEventListener("animationend", onEnd);
    timers.push(window.setTimeout(onEnd, durationMs + 80));
  });
}

/**
 * Trigger a vibration pattern when the Vibration API is available.
 * When `opts.shakeFallback !== false` (default), ALWAYS runs visual {@link shakeElement}
 * as well — desktop browsers often expose `navigator.vibrate` that returns true but
 * does nothing, so shake must not wait on vibrate failing.
 * Optionally still calls `navigator.vibrate` when supported.
 * Shake target: `opts.target`, else `main`, else `document.body`.
 * @param {number|number[]} [pattern=[200,100,200]] Duration(s) in ms
 * @param {object} [opts]
 * @param {boolean} [opts.shakeFallback=true] Always run visual shake (in addition to vibrate)
 * @param {Element|string} [opts.target] Shake target (default: main, then body)
 * @param {boolean} [opts.reduceMotion] Passed through to shakeElement
 * @param {number} [opts.durationMs] Shake duration (ms)
 * @param {number} [opts.amplitudePx] Shake amplitude (px)
 * @returns {boolean} true if vibrate was attempted OR shake fallback was started
 */
export function vibratePattern(pattern = [200, 100, 200], opts = {}) {
  const {
    shakeFallback = true,
    target,
    reduceMotion: reduceMotionOpt,
    durationMs: shakeDurationMs,
    amplitudePx: shakeAmplitudePx,
  } = opts;

  let vibrated = false;
  if (isVibrateSupported()) {
    try {
      vibrated = !!navigator.vibrate(pattern);
    } catch {
      vibrated = false;
    }
  }

  if (shakeFallback === false) {
    return vibrated;
  }

  if (typeof document === "undefined") {
    return vibrated;
  }

  const shakeTarget =
    resolveElement(target) ||
    document.querySelector("main") ||
    document.body;

  if (!shakeTarget) {
    return vibrated;
  }

  // Always shake when fallback is on — desktop vibrate is often a no-op.
  const shakeOpts = { reduceMotion: reduceMotionOpt };
  if (shakeDurationMs != null) shakeOpts.durationMs = shakeDurationMs;
  if (shakeAmplitudePx != null) shakeOpts.amplitudePx = shakeAmplitudePx;
  shakeElement(shakeTarget, shakeOpts);
  return true;
}

/**
 * Pulse an element's border to draw visual attention.
 * Honors reduced motion by showing a brief static outline instead of pulsing.
 * Starting a new pulse on the same element cancels/replaces any prior pulse (timers + outline).
 * @param {Element|string} target Element or CSS selector
 * @param {object} [opts]
 * @param {string} [opts.color="#ff9800"] Border / outline color
 * @param {number} [opts.times=3] Number of pulse cycles
 * @param {number} [opts.durationMs=900] Total animation duration
 * @param {boolean} [opts.reduceMotion] Force skip/respect reduced motion (default: OS preference)
 * @returns {Promise<void>}
 */
export function pulseBorder(target, opts = {}) {
  const {
    color = "#ff9800",
    times = 3,
    durationMs = 900,
    reduceMotion: reduceMotionOpt,
  } = opts;

  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve();
      return;
    }
    // resolveElement: invalid CSS selectors must not throw (querySelector can)
    const el = resolveElement(target);
    if (!el) {
      resolve();
      return;
    }

    // Cancel/replace any in-flight pulse on this element (parity with shake WeakMap abort)
    const prevAbort = activePulseAbort.get(el);
    if (prevAbort) {
      try {
        prevAbort();
      } catch {
        /* ignore */
      }
      activePulseAbort.delete(el);
    }

    const prevOutline = el.style.outline;
    const prevTransition = el.style.transition;
    const prevOffset = el.style.outlineOffset;
    /** @type {number[]} */
    const timers = [];

    const cleanup = () => {
      for (const id of timers) window.clearTimeout(id);
      timers.length = 0;
      el.style.outline = prevOutline;
      el.style.transition = prevTransition;
      el.style.outlineOffset = prevOffset;
    };

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (activePulseAbort.get(el) === abort) {
        activePulseAbort.delete(el);
      }
      cleanup();
      resolve();
    };

    const abort = () => {
      // Prior pulse replaced — restore styles and resolve
      finish();
    };
    activePulseAbort.set(el, abort);

    if (shouldReduceMotion(reduceMotionOpt)) {
      el.style.outlineOffset = "2px";
      el.style.outline = `3px solid ${color}`;
      timers.push(
        window.setTimeout(() => {
          finish();
        }, Math.min(400, durationMs))
      );
      return;
    }

    el.style.transition = "outline-color 120ms ease, outline-width 120ms ease";
    el.style.outlineOffset = "2px";

    const stepMs = Math.max(80, Math.floor(durationMs / (times * 2)));
    let step = 0;
    const totalSteps = times * 2;

    const tick = () => {
      if (done) return;
      const on = step % 2 === 0;
      el.style.outline = on ? `3px solid ${color}` : `3px solid transparent`;
      step += 1;
      if (step >= totalSteps) {
        timers.push(
          window.setTimeout(() => {
            finish();
          }, stepMs)
        );
        return;
      }
      timers.push(window.setTimeout(tick, stepMs));
    };
    tick();
  });
}

/**
 * Combined alert: optional flash + banner + vibrate (with shake fallback).
 * When `flashColor` is omitted: level `urgent` ALWAYS flashes red `#e53935`;
 * other levels use auto contrast (white on dark, dark on light).
 * Flash uses the shared photosensitivity rate limit in {@link flashScreen}.
 * Passes `reduceMotion` through to flash / shake.
 * @param {string} message Banner text
 * @param {object} [opts]
 * @param {boolean} [opts.flash=true]
 * @param {boolean} [opts.banner=true]
 * @param {boolean} [opts.vibrate=true]
 * @param {"info"|"warn"|"urgent"} [opts.level="warn"]
 * @param {string} [opts.flashColor] Explicit flash color; omit for urgent red / auto contrast
 * @param {number|number[]} [opts.vibratePattern]
 * @param {boolean} [opts.shakeFallback=true]
 * @param {Element|string} [opts.shakeTarget]
 * @param {{ durationMs?: number, amplitudePx?: number }} [opts.shake] Passed to shakeElement
 * @param {number} [opts.durationMs] Banner auto-dismiss delay
 * @param {string} [opts.closeLabel] Banner close button aria-label
 * @param {boolean} [opts.reduceMotion] Force skip/respect reduced motion for flash/shake
 * @returns {Promise<{banner: HTMLElement|null, vibrated: boolean}>}
 */
export async function alertCombo(message, opts = {}) {
  const {
    flash = true,
    banner = true,
    vibrate = true,
    level = "warn",
    flashColor,
    vibratePattern: vPattern = [200, 80, 200, 80, 400],
    shakeFallback = true,
    shakeTarget,
    shake,
    durationMs,
    closeLabel,
    reduceMotion: reduceMotionOpt,
  } = opts;

  const reduce = shouldReduceMotion(reduceMotionOpt);
  const tasks = [];
  if (flash && !reduce) {
    const flashOpts = { reduceMotion: false };
    if (flashColor !== undefined && flashColor !== null) {
      flashOpts.color = flashColor;
    } else if (level === "urgent") {
      // Always red for urgent — never contrast white
      flashOpts.color = "#e53935";
    }
    // else: omit color → flashScreen auto contrast
    tasks.push(flashScreen(flashOpts));
  }

  let bannerEl = null;
  if (banner) {
    const bannerOpts = { level };
    if (durationMs != null) bannerOpts.durationMs = durationMs;
    if (closeLabel != null) bannerOpts.closeLabel = closeLabel;
    bannerEl = await showBanner(message, bannerOpts);
  }

  let vibrated = false;
  if (vibrate) {
    const vibOpts = {
      shakeFallback,
      target: shakeTarget,
      reduceMotion: reduceMotionOpt,
    };
    if (shake && shake.durationMs != null) vibOpts.durationMs = shake.durationMs;
    if (shake && shake.amplitudePx != null) vibOpts.amplitudePx = shake.amplitudePx;
    vibrated = vibratePattern(vPattern, vibOpts);
  }

  await Promise.all(tasks);
  return { banner: bannerEl, vibrated };
}

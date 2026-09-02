/**
 * Visual + haptic web alerts (no sound) for deaf / hard-of-hearing accessibility.
 * @module deaf-signal/signals
 */

const DEFAULT_FLASH_MS = 400;
const DEFAULT_BANNER_MS = 3000;
const DEFAULT_SHAKE_MS = 450;

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

  if (typeof document !== "undefined") {
    try {
      const probe = document.createElement("div");
      probe.style.color = c;
      probe.style.display = "none";
      document.body.appendChild(probe);
      const computed = getComputedStyle(probe).color;
      probe.remove();
      if (computed && computed !== c) return parseCssColor(computed);
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

/**
 * Briefly flash the viewport with a solid overlay color.
 * When `opts.color` is omitted, picks a contrast color from the page background
 * (dark → white, light → near-black) via {@link contrastFlashColor}.
 * Honors `prefers-reduced-motion` (or `opts.reduceMotion`) by skipping the flash.
 * @param {object} [opts]
 * @param {string} [opts.color] Overlay background color (auto contrast when omitted)
 * @param {number} [opts.durationMs=400] How long the flash stays visible
 * @param {number} [opts.opacity=0.55] Overlay opacity 0–1
 * @param {boolean} [opts.reduceMotion] Force skip/respect reduced motion (default: OS preference)
 * @returns {Promise<void>}
 */
export function flashScreen(opts = {}) {
  const {
    durationMs = DEFAULT_FLASH_MS,
    opacity = 0.55,
    reduceMotion: reduceMotionOpt,
  } = opts;
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
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, {
      position: "fixed",
      inset: "0",
      background: color,
      opacity: String(opacity),
      pointerEvents: "none",
      zIndex: "2147483646",
      transition: "opacity 120ms ease-out",
    });
    document.body.appendChild(el);
    window.setTimeout(() => {
      el.style.opacity = "0";
      window.setTimeout(() => {
        el.remove();
        resolve();
      }, 140);
    }, durationMs);
  });
}

/**
 * Show a high-contrast banner message at the top of the page.
 * @param {string} message Text to display
 * @param {object} [opts]
 * @param {"info"|"warn"|"urgent"} [opts.level="info"] Visual severity
 * @param {number} [opts.durationMs=3000] Auto-dismiss delay (0 = stay until closed)
 * @returns {Promise<HTMLElement>} The banner element
 */
export function showBanner(message, opts = {}) {
  const { level = "info", durationMs = DEFAULT_BANNER_MS } = opts;

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

    const existing = document.getElementById("deaf-signal-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "deaf-signal-banner";
    banner.setAttribute("role", "alert");
    banner.setAttribute("aria-live", "assertive");
    Object.assign(banner.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      padding: "14px 48px 14px 16px",
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
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    Object.assign(close.style, {
      position: "absolute",
      top: "8px",
      right: "12px",
      background: "transparent",
      border: "none",
      color: colors.fg,
      fontSize: "24px",
      cursor: "pointer",
      lineHeight: "1",
      padding: "4px 8px",
    });
    close.addEventListener("click", () => banner.remove());
    banner.appendChild(close);
    document.body.appendChild(banner);

    if (durationMs > 0) {
      window.setTimeout(() => {
        if (banner.isConnected) banner.remove();
      }, durationMs);
    }
    resolve(banner);
  });
}

/**
 * Visual shake (drebėjimas) via CSS transform — fallback when Vibration API is missing.
 * Honors `prefers-reduced-motion` / `opts.reduceMotion` with a brief opacity pulse
 * (or no heavy shake). Restores inline styles afterward.
 * @param {Element|string} target Element or CSS selector
 * @param {object} [opts]
 * @param {number} [opts.durationMs=450] Total shake duration
 * @param {number} [opts.amplitudePx=8] Max horizontal offset in px
 * @param {boolean} [opts.reduceMotion] Force skip/respect reduced motion
 * @returns {Promise<boolean>} true if a visual cue ran
 */
export function shakeElement(target, opts = {}) {
  const {
    durationMs = DEFAULT_SHAKE_MS,
    amplitudePx = 8,
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

    const prevTransform = el.style.transform;
    const prevTransition = el.style.transition;
    const prevOpacity = el.style.opacity;
    const prevWillChange = el.style.willChange;

    const cleanup = () => {
      el.style.transform = prevTransform;
      el.style.transition = prevTransition;
      el.style.opacity = prevOpacity;
      el.style.willChange = prevWillChange;
    };

    if (shouldReduceMotion(reduceMotionOpt)) {
      // Brief opacity pulse instead of heavy shake
      el.style.transition = "opacity 80ms ease";
      el.style.opacity = "0.45";
      window.setTimeout(() => {
        el.style.opacity = prevOpacity || "1";
        window.setTimeout(() => {
          cleanup();
          resolve(true);
        }, 100);
      }, Math.min(180, durationMs));
      return;
    }

    el.style.willChange = "transform";
    el.style.transition = "none";

    const keyframes = [
      0,
      -amplitudePx,
      amplitudePx,
      -amplitudePx * 0.7,
      amplitudePx * 0.7,
      -amplitudePx * 0.4,
      amplitudePx * 0.35,
      0,
    ];
    const stepMs = Math.max(30, Math.floor(durationMs / (keyframes.length - 1)));
    let i = 0;

    const tick = () => {
      el.style.transform = `translateX(${keyframes[i]}px)`;
      i += 1;
      if (i >= keyframes.length) {
        cleanup();
        resolve(true);
        return;
      }
      window.setTimeout(tick, stepMs);
    };
    tick();
  });
}

/**
 * Trigger a vibration pattern when the Vibration API is available.
 * When vibrate is unsupported and `opts.shakeFallback !== false`, falls back to
 * {@link shakeElement} on `opts.target`, else `main`, else `document.body`.
 * @param {number|number[]} [pattern=[200,100,200]] Duration(s) in ms
 * @param {object} [opts]
 * @param {boolean} [opts.shakeFallback=true] Use visual shake when vibrate missing
 * @param {Element|string} [opts.target] Shake target (default: main, then body)
 * @param {boolean} [opts.reduceMotion] Passed through to shakeElement
 * @returns {boolean} true if vibrate ran OR shake fallback was started
 */
export function vibratePattern(pattern = [200, 100, 200], opts = {}) {
  const { shakeFallback = true, target, reduceMotion: reduceMotionOpt } = opts;

  if (isVibrateSupported()) {
    try {
      const ok = navigator.vibrate(pattern);
      if (ok) return true;
    } catch {
      /* fall through to shake */
    }
  }

  if (shakeFallback === false) {
    return false;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const shakeTarget =
    resolveElement(target) ||
    document.querySelector("main") ||
    document.body;

  if (!shakeTarget) {
    return false;
  }

  // Fire-and-forget visual cue; caller only needs to know a cue started.
  shakeElement(shakeTarget, { reduceMotion: reduceMotionOpt });
  return true;
}

/**
 * Pulse an element's border to draw attention without sound.
 * Honors reduced motion by showing a brief static outline instead of pulsing.
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
    const el =
      typeof target === "string" ? document.querySelector(target) : target;
    if (!el || !(el instanceof Element)) {
      resolve();
      return;
    }

    const prevOutline = el.style.outline;
    const prevTransition = el.style.transition;
    const prevOffset = el.style.outlineOffset;

    if (shouldReduceMotion(reduceMotionOpt)) {
      el.style.outlineOffset = "2px";
      el.style.outline = `3px solid ${color}`;
      window.setTimeout(() => {
        el.style.outline = prevOutline;
        el.style.outlineOffset = prevOffset;
        resolve();
      }, Math.min(400, durationMs));
      return;
    }

    el.style.transition = "outline-color 120ms ease, outline-width 120ms ease";
    el.style.outlineOffset = "2px";

    const stepMs = Math.max(80, Math.floor(durationMs / (times * 2)));
    let step = 0;
    const totalSteps = times * 2;

    const tick = () => {
      const on = step % 2 === 0;
      el.style.outline = on ? `3px solid ${color}` : `3px solid transparent`;
      step += 1;
      if (step >= totalSteps) {
        window.setTimeout(() => {
          el.style.outline = prevOutline;
          el.style.transition = prevTransition;
          el.style.outlineOffset = prevOffset;
          resolve();
        }, stepMs);
        return;
      }
      window.setTimeout(tick, stepMs);
    };
    tick();
  });
}

/**
 * Combined alert: optional flash + banner + vibrate (with shake fallback).
 * When `flashColor` is omitted, flash uses auto contrast (white on dark, dark on light).
 * Urgent may still receive a light tint overlay preference but defaults to visible contrast.
 * Passes `reduceMotion` through to flash / shake.
 * @param {string} message Banner text
 * @param {object} [opts]
 * @param {boolean} [opts.flash=true]
 * @param {boolean} [opts.banner=true]
 * @param {boolean} [opts.vibrate=true]
 * @param {"info"|"warn"|"urgent"} [opts.level="warn"]
 * @param {string} [opts.flashColor] Explicit flash color; omit for auto contrast
 * @param {number|number[]} [opts.vibratePattern]
 * @param {boolean} [opts.shakeFallback=true]
 * @param {Element|string} [opts.shakeTarget]
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
    reduceMotion: reduceMotionOpt,
  } = opts;

  const reduce = shouldReduceMotion(reduceMotionOpt);
  const tasks = [];
  if (flash && !reduce) {
    const flashOpts = { reduceMotion: false };
    if (flashColor !== undefined && flashColor !== null) {
      flashOpts.color = flashColor;
    } else if (level === "urgent") {
      // Prefer visible white on dark; light pink tint only when background is light
      const base = contrastFlashColor();
      flashOpts.color = base === "#ffffff" ? "#ffffff" : "#c62828";
    }
    // else: omit color → flashScreen auto contrast
    tasks.push(flashScreen(flashOpts));
  }

  let bannerEl = null;
  if (banner) {
    bannerEl = await showBanner(message, { level });
  }

  let vibrated = false;
  if (vibrate) {
    vibrated = vibratePattern(vPattern, {
      shakeFallback,
      target: shakeTarget,
      reduceMotion: reduceMotionOpt,
    });
  }

  await Promise.all(tasks);
  return { banner: bannerEl, vibrated };
}

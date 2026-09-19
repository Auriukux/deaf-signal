// @ts-nocheck
/**
 * Viewport flash + contrast helpers.
 * @module deaf-signal/flash
 */

import { shouldReduceMotion, resolveElement } from "./internal.js";

const DEFAULT_FLASH_MS = 400;

/**
 * Max flashScreen duration (ms) — a11y / photosensitivity cap.
 * Longer requests are clamped; default remains {@link DEFAULT_FLASH_MS} (400).
 */
export const FLASH_DURATION_MAX = 800;

/**
 * Clamp flash duration to 0…{@link FLASH_DURATION_MAX} (invalid → default 400).
 * @param {unknown} durationMs
 * @returns {number}
 */
export function clampFlashDuration(durationMs) {
  const n = Number(durationMs);
  const v = Number.isFinite(n) ? n : DEFAULT_FLASH_MS;
  return Math.max(0, Math.min(FLASH_DURATION_MAX, v));
}

function parseCssColor(color) {
  if (!color || typeof color !== "string") return null;
  const c = color.trim().toLowerCase();
  if (c === "transparent" || c === "rgba(0, 0, 0, 0)") return null;
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      h = h.split("").map((ch) => ch + ch).join("");
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  const rgb = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
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
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext && canvas.getContext("2d");
      if (ctx) {
        const sentinel = "#abcdef";
        ctx.fillStyle = sentinel;
        ctx.fillStyle = c;
        const computed = String(ctx.fillStyle || "");
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

function relativeLuminance(r, g, b) {
  const toLinear = (channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

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

export function contrastFlashColor(root) {
  const el =
    resolveElement(root) ||
    (typeof document !== "undefined" ? document.body : null) ||
    (typeof document !== "undefined" ? document.documentElement : null);
  const rgb = sampleBackgroundRgb(el) || { r: 15, g: 20, b: 25 };
  const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
  return lum < 0.45 ? "#ffffff" : "#111111";
}

let sharedFlashOverlay = null;
let sharedFlashHideTimer = null;
let sharedFlashRemoveTimer = null;
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

export function settleFlashResolve(previousResolve) {
  if (typeof previousResolve === "function") previousResolve();
  return null;
}

export const FLASH_RATE_MAX = 2;
export const FLASH_RATE_WINDOW_MS = 1000;
export const FLASH_MIN_GAP_MS = 400;

let flashStartTimestamps = [];

export function resetFlashRateLimit() {
  flashStartTimestamps = [];
}

export function canStartFlash(now = Date.now()) {
  const t = Number(now);
  const at = Number.isFinite(t) ? t : Date.now();
  const recent = flashStartTimestamps.filter((ts) => at - ts < FLASH_RATE_WINDOW_MS);
  if (recent.length >= FLASH_RATE_MAX) return false;
  const last = recent[recent.length - 1];
  if (last != null && at - last < FLASH_MIN_GAP_MS) return false;
  return true;
}

export function noteFlashStart(now = Date.now()) {
  const t = Number(now);
  const at = Number.isFinite(t) ? t : Date.now();
  flashStartTimestamps = flashStartTimestamps.filter((ts) => at - ts < FLASH_RATE_WINDOW_MS);
  flashStartTimestamps.push(at);
}

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

export function flashScreen(opts = {}) {
  const {
    durationMs: durationMsRaw = DEFAULT_FLASH_MS,
    reduceMotion: reduceMotionOpt,
  } = opts;
  const durationMs = clampFlashDuration(durationMsRaw);
  const rawOpacity = opts.opacity;
  const opacityNum =
    typeof rawOpacity === "number" && Number.isFinite(rawOpacity)
      ? rawOpacity
      : 0.55;
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
    if (durationMs <= 0) {
      resolve();
      return;
    }
    if (!canStartFlash()) {
      resolve();
      return;
    }
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

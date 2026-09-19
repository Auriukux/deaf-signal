// @ts-nocheck
/**
 * Visual shake, pulse, and vibration helpers.
 * @module deaf-signal/motion
 */

import { shouldReduceMotion, resolveElement } from "./internal.js";

const DEFAULT_SHAKE_MS = 550;

export const SHAKE_AMPLITUDE_MIN = 2;
export const SHAKE_AMPLITUDE_MAX = 64;

export function clampShakeAmplitude(amplitudePx) {
  const n = Number(amplitudePx);
  const v = Number.isFinite(n) ? n : 16;
  return Math.max(SHAKE_AMPLITUDE_MIN, Math.min(SHAKE_AMPLITUDE_MAX, v));
}

export function isVibrateSupported() {
  return (
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
  );
}

const SHAKE_STYLE_ID = "deaf-signal-shake-style";
const activeShakeAbort = new WeakMap();
const activePulseAbort = new WeakMap();

function ensureShakeKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SHAKE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SHAKE_STYLE_ID;
  style.textContent = `@keyframes deaf-signal-shake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  12% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * -1)) rotate(-1.2deg); }
  24% { transform: translateX(var(--deaf-shake-amp, 16px)) rotate(1.2deg); }
  36% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * -0.85)) rotate(-0.9deg); }
  48% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * 0.85)) rotate(0.9deg); }
  60% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * -0.55)) rotate(-0.5deg); }
  72% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * 0.55)) rotate(0.5deg); }
  84% { transform: translateX(calc(var(--deaf-shake-amp, 16px) * -0.25)) rotate(-0.2deg); }
}`;
  document.head.appendChild(style);
}

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

    const prevAbort = activeShakeAbort.get(el);
    if (prevAbort) {
      try { prevAbort(); } catch { /* ignore */ }
      activeShakeAbort.delete(el);
    }

    const prevTransform = el.style.transform;
    const prevTransition = el.style.transition;
    const prevOpacity = el.style.opacity;
    const prevWillChange = el.style.willChange;
    const prevAnimation = el.style.animation;
    const prevAmp = el.style.getPropertyValue("--deaf-shake-amp");

    let waapiAnim = null;
    const timers = [];
    let onEnd = null;

    const cleanup = () => {
      if (onEnd) {
        el.removeEventListener("animationend", onEnd);
        onEnd = null;
      }
      for (const id of timers) window.clearTimeout(id);
      timers.length = 0;
      if (waapiAnim) {
        try { waapiAnim.cancel(); } catch { /* ignore */ }
        waapiAnim = null;
      }
      el.style.transform = prevTransform;
      el.style.transition = prevTransition;
      el.style.opacity = prevOpacity;
      el.style.willChange = prevWillChange;
      el.style.animation = prevAnimation;
      if (prevAmp) el.style.setProperty("--deaf-shake-amp", prevAmp);
      else el.style.removeProperty("--deaf-shake-amp");
    };

    let done = false;
    const finish = (ran) => {
      if (done) return;
      done = true;
      if (activeShakeAbort.get(el) === abort) activeShakeAbort.delete(el);
      cleanup();
      resolve(ran);
    };
    const abort = () => finish(false);
    activeShakeAbort.set(el, abort);

    if (shouldReduceMotion(reduceMotionOpt)) {
      el.style.transition = "opacity 80ms ease";
      el.style.opacity = "0.45";
      timers.push(window.setTimeout(() => {
        el.style.opacity = prevOpacity || "1";
        timers.push(window.setTimeout(() => finish(true), 100));
      }, Math.min(180, durationMs)));
      return;
    }

    ensureShakeKeyframes();
    const amp = clampShakeAmplitude(amplitudePx);
    el.style.setProperty("--deaf-shake-amp", `${amp}px`);
    el.style.willChange = "transform";
    el.style.transition = "none";

    if (typeof el.animate === "function") {
      const a = amp;
      waapiAnim = el.animate([
        { transform: "translateX(0) rotate(0deg)" },
        { transform: `translateX(${-a}px) rotate(-1.2deg)` },
        { transform: `translateX(${a}px) rotate(1.2deg)` },
        { transform: `translateX(${-a * 0.85}px) rotate(-0.9deg)` },
        { transform: `translateX(${a * 0.85}px) rotate(0.9deg)` },
        { transform: `translateX(${-a * 0.55}px) rotate(-0.5deg)` },
        { transform: `translateX(${a * 0.55}px) rotate(0.5deg)` },
        { transform: `translateX(${-a * 0.25}px) rotate(-0.2deg)` },
        { transform: "translateX(0) rotate(0deg)" },
      ], { duration: durationMs, easing: "ease-in-out", fill: "none" });
      waapiAnim.onfinish = () => finish(true);
      waapiAnim.oncancel = () => {};
      return;
    }

    el.style.animation = `deaf-signal-shake ${durationMs}ms ease-in-out 1`;
    onEnd = () => finish(true);
    el.addEventListener("animationend", onEnd);
    timers.push(window.setTimeout(onEnd, durationMs + 80));
  });
}

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
    try { vibrated = !!navigator.vibrate(pattern); }
    catch { vibrated = false; }
  }
  if (shakeFallback === false) return vibrated;
  if (typeof document === "undefined") return vibrated;
  const shakeTarget = resolveElement(target);
  if (!shakeTarget) return vibrated;
  const shakeOpts = { reduceMotion: reduceMotionOpt };
  if (shakeDurationMs != null) shakeOpts.durationMs = shakeDurationMs;
  if (shakeAmplitudePx != null) shakeOpts.amplitudePx = shakeAmplitudePx;
  shakeElement(shakeTarget, shakeOpts);
  return true;
}

export function pulseBorder(target, opts = {}) {
  const {
    color = "#ff9800",
    times = 3,
    durationMs = 900,
    reduceMotion: reduceMotionOpt,
  } = opts;

  return new Promise((resolve) => {
    if (typeof document === "undefined") { resolve(); return; }
    const el = resolveElement(target);
    if (!el) { resolve(); return; }

    const prevAbort = activePulseAbort.get(el);
    if (prevAbort) {
      try { prevAbort(); } catch { /* ignore */ }
      activePulseAbort.delete(el);
    }

    const prevOutline = el.style.outline;
    const prevTransition = el.style.transition;
    const prevOffset = el.style.outlineOffset;
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
      if (activePulseAbort.get(el) === abort) activePulseAbort.delete(el);
      cleanup();
      resolve();
    };
    const abort = () => finish();
    activePulseAbort.set(el, abort);

    if (shouldReduceMotion(reduceMotionOpt)) {
      el.style.outlineOffset = "2px";
      el.style.outline = `3px solid ${color}`;
      timers.push(window.setTimeout(() => finish(), Math.min(400, durationMs)));
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
        timers.push(window.setTimeout(() => finish(), stepMs));
        return;
      }
      timers.push(window.setTimeout(tick, stepMs));
    };
    tick();
  });
}

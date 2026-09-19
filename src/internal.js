// @ts-nocheck
/**
 * Shared DOM helpers for signal modules. Not a public package export.
 * @module deaf-signal/internal
 */

/**
 * Whether the user (or caller) prefers reduced motion.
 * Explicit `reduceMotion` wins; otherwise checks `prefers-reduced-motion`.
 * @param {boolean} [explicit]
 * @returns {boolean}
 */
export function shouldReduceMotion(explicit) {
  if (explicit === true) return true;
  if (explicit === false) return false;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

/**
 * Resolve an Element from a selector string or Element.
 * @param {Element|string|null|undefined} target
 * @returns {Element|null}
 */
export function resolveElement(target) {
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

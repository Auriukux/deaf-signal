// @ts-nocheck
/**
 * Combined flash + banner + vibrate cue.
 * @module deaf-signal/combo
 */

import { shouldReduceMotion } from "./internal.js";
import { flashScreen } from "./flash.js";
import { showBanner } from "./banner.js";
import { vibratePattern } from "./motion.js";

/**
 * Combined alert: optional flash + banner + vibrate (with shake fallback).
 * @param {string} message Banner text
 * @param {object} [opts]
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
      flashOpts.color = "#e53935";
    }
    tasks.push(flashScreen(flashOpts));
  }

  let bannerEl = null;
  if (banner) {
    const bannerOpts = { level };
    if (durationMs != null) bannerOpts.durationMs = durationMs;
    if (closeLabel != null) bannerOpts.closeLabel = closeLabel;
    if (opts.focusClose === true) bannerOpts.focusClose = true;
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

/**
 * Optional microphone loud-sound detection (Web Audio only — no ML / cloud).
 * High RMS threshold by design: quiet rooms and soft speech should NOT fire.
 * RMS loudness ≠ siren / door / horn classification — peaks only, not event type.
 * @module deaf-signal/listen
 */

import { runAlert } from "./alerts.js";
import { getNotifyPermission, notifyAlert } from "./notify.js";

/**
 * Default RMS threshold (0–1). Tuned so ambient noise / whispering
 * does not trip; override via `threshold` when you need a lower/higher bar.
 * @type {number}
 */
export const DEFAULT_LOUD_THRESHOLD = 0.25;

/** Default cooldown between loud triggers (ms). */
export const DEFAULT_MIN_INTERVAL_MS = 2500;

/** Default product alert when loud peak fires (`false` via opts.alert to skip). */
export const DEFAULT_LOUD_ALERT = "urgent";

/** Approx. sample interval for level checks (ms). */
const SAMPLE_INTERVAL_MS = 80;

/** @type {LoudListenController|null} */
let activeController = null;

/** Generation token so a second start aborts an in-flight first start. */
let listenGeneration = 0;

/** Tracks from an in-flight getUserMedia that has not yet become active. */
/** @type {MediaStream|null} */
let pendingStream = null;

/**
 * @typedef {object} LoudEvent
 * @property {number} level Same as rms (0–1), convenient for meters
 * @property {number} rms Root-mean-square of normalised time-domain samples
 */

/**
 * @typedef {object} StartLoudListenOptions
 * @property {number} [threshold] RMS 0–1; default {@link DEFAULT_LOUD_THRESHOLD}
 * @property {number} [minIntervalMs] Cooldown between fires; default 2500
 * @property {(ev: LoudEvent) => void} [onLoud] Called when threshold is exceeded
 * @property {(level: number) => void} [onLevel] Optional live meter callback (~50–100ms)
 * @property {"urgent"|"siren"|false|string} [alert] Auto `runAlert` name; default `"urgent"` (not siren — RMS ≠ classifier); `false` to skip
 * @property {boolean} [notify] If true and Notification already granted, also `notifyAlert` (in addition to runAlert’s own notify path when alert runs)
 * @property {object} [alertOpts] Extra opts forwarded to `runAlert`
 */

/**
 * @typedef {object} LoudListenController
 * @property {() => void} stop Stop listening; release mic + AudioContext
 * @property {() => number|null} getInputLevel Current RMS while running, else null
 * @property {boolean} active
 */

/**
 * Resolve auto-alert name for {@link startLoudListen}.
 * Default is `"urgent"` — do not pretend RMS peaks are a siren/door classifier.
 * @param {"urgent"|"siren"|false|string|undefined|null} alert
 * @returns {string|null} Alert name, or `null` when alerts are disabled
 */
export function resolveLoudAlertName(alert) {
  if (alert === false) return null;
  if (alert != null) return String(alert);
  return DEFAULT_LOUD_ALERT;
}

/**
 * @returns {boolean} Whether getUserMedia + AudioContext are available
 */
export function isListenSupported() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const hasMedia = !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
  const AC = window.AudioContext || window.webkitAudioContext;
  return !!(hasMedia && AC);
}

/**
 * Current input RMS while a listen session is active, else `null`.
 * @returns {number|null}
 */
export function getInputLevel() {
  return activeController ? activeController.getInputLevel() : null;
}

/**
 * Stop pending getUserMedia tracks (in-flight start) if any.
 */
function stopPendingStream() {
  if (!pendingStream) return;
  try {
    pendingStream.getTracks().forEach((t) => t.stop());
  } catch (_) {}
  pendingStream = null;
}

/**
 * Stop the active loud-listen session (if any) and abort in-flight starts.
 */
export function stopLoudListen() {
  listenGeneration += 1;
  stopPendingStream();
  if (activeController) {
    activeController.stop();
  }
}

/**
 * Compute RMS (0–1) from AnalyserNode byte time-domain data.
 * @param {AnalyserNode} analyser
 * @param {Uint8Array} buffer
 * @returns {number}
 */
function computeRms(analyser, buffer) {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  const n = buffer.length;
  for (let i = 0; i < n; i++) {
    const v = (buffer[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / n);
}

/**
 * Start microphone loud-sound detection.
 * Requires a secure context (HTTPS / localhost) and mic permission.
 *
 * A second call aborts any in-flight first start (generation token + stop
 * pending tracks) before opening a new session.
 *
 * Default `alert` is `"urgent"` — RMS loudness peaks are **not** a siren/door
 * classifier; pass `alert: false` + `onLoud` when you only want the callback.
 *
 * @param {StartLoudListenOptions} [opts]
 * @returns {Promise<LoudListenController>}
 */
export async function startLoudListen(opts = {}) {
  if (!isListenSupported()) {
    throw new Error(
      "Loud listen is not supported (need getUserMedia + AudioContext in a secure context)."
    );
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new Error(
      "Microphone access requires a secure context (HTTPS or localhost)."
    );
  }

  // Abort any in-flight start + replace any existing session
  const myGen = ++listenGeneration;
  stopPendingStream();
  if (activeController) {
    activeController.stop();
  }

  const threshold =
    typeof opts.threshold === "number" && Number.isFinite(opts.threshold)
      ? Math.min(1, Math.max(0, opts.threshold))
      : DEFAULT_LOUD_THRESHOLD;
  const minIntervalMs =
    typeof opts.minIntervalMs === "number" && opts.minIntervalMs >= 0
      ? opts.minIntervalMs
      : DEFAULT_MIN_INTERVAL_MS;
  const alertName = resolveLoudAlertName(opts.alert);

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    const name = err && err.name ? err.name : "Error";
    const msg =
      name === "NotAllowedError" || name === "PermissionDeniedError"
        ? "Microphone permission denied."
        : name === "NotFoundError"
          ? "No microphone found."
          : `Microphone access failed: ${name}`;
    const e = new Error(msg);
    e.cause = err;
    e.name = name;
    throw e;
  }

  // Race: a newer startLoudListen / stopLoudListen won while we awaited permission
  if (myGen !== listenGeneration) {
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    throw new Error("Loud listen start aborted (superseded by a newer start/stop).");
  }

  pendingStream = stream;

  const AC = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AC();
  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch (_) {
      /* ignore */
    }
  }

  if (myGen !== listenGeneration) {
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    try {
      if (audioContext.state !== "closed") audioContext.close();
    } catch (_) {}
    if (pendingStream === stream) pendingStream = null;
    throw new Error("Loud listen start aborted (superseded by a newer start/stop).");
  }

  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.3;
  source.connect(analyser);
  // Do not connect to destination — silent monitoring only

  const timeData = new Uint8Array(analyser.fftSize);
  let lastRms = 0;
  let lastFireAt = 0;
  let stopped = false;
  let timerId = null;
  let rafId = null;

  function cleanup() {
    if (stopped) return;
    stopped = true;
    if (timerId != null) {
      clearInterval(timerId);
      timerId = null;
    }
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    try {
      source.disconnect();
    } catch (_) {}
    try {
      analyser.disconnect();
    } catch (_) {}
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    try {
      if (audioContext.state !== "closed") {
        audioContext.close();
      }
    } catch (_) {}
    if (pendingStream === stream) pendingStream = null;
    if (activeController === controller) {
      activeController = null;
    }
  }

  async function onExceed(rms) {
    const now = Date.now();
    if (now - lastFireAt < minIntervalMs) return;
    lastFireAt = now;

    const ev = { level: rms, rms };
    if (typeof opts.onLoud === "function") {
      try {
        opts.onLoud(ev);
      } catch (_) {
        /* user callback */
      }
    }

    if (alertName) {
      try {
        await runAlert(alertName, {
          ...(opts.alertOpts || {}),
        });
      } catch (_) {
        /* alert helpers should not break listen loop */
      }
    }

    // Optional extra notify when explicitly requested and already granted
    // (runAlert already notifies when granted; this covers alert === false cases)
    if (opts.notify === true && getNotifyPermission() === "granted" && !alertName) {
      try {
        await notifyAlert("Loud sound", {
          body: "Strong loudness peak detected nearby.",
          level: "urgent",
          tag: "deaf-signal-loud",
          flash: false,
          shake: false,
          combo: false,
          notification: true,
        });
      } catch (_) {}
    }
  }

  function tick() {
    if (stopped) return;
    const rms = computeRms(analyser, timeData);
    lastRms = rms;
    if (typeof opts.onLevel === "function") {
      try {
        opts.onLevel(rms);
      } catch (_) {}
    }
    if (rms >= threshold) {
      onExceed(rms);
    }
  }

  timerId = setInterval(tick, SAMPLE_INTERVAL_MS);
  rafId = requestAnimationFrame(() => {
    rafId = null;
    tick();
  });

  /** @type {LoudListenController} */
  const controller = {
    active: true,
    stop() {
      cleanup();
      controller.active = false;
    },
    getInputLevel() {
      return stopped ? null : lastRms;
    },
  };

  pendingStream = null;
  activeController = controller;
  return controller;
}

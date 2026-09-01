/**
 * Visual + haptic web alerts (no sound) for deaf / hard-of-hearing accessibility.
 * @module deaf-signal/signals
 */

const DEFAULT_FLASH_MS = 400;
const DEFAULT_BANNER_MS = 3000;

/**
 * Briefly flash the viewport with a solid overlay color.
 * @param {object} [opts]
 * @param {string} [opts.color="#ffeb3b"] Overlay background color
 * @param {number} [opts.durationMs=400] How long the flash stays visible
 * @param {number} [opts.opacity=0.55] Overlay opacity 0–1
 * @returns {Promise<void>}
 */
export function flashScreen(opts = {}) {
  const {
    color = "#ffeb3b",
    durationMs = DEFAULT_FLASH_MS,
    opacity = 0.55,
  } = opts;

  return new Promise((resolve) => {
    if (typeof document === "undefined") {
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
 * Trigger a vibration pattern when the Vibration API is available.
 * Falls back silently on unsupported devices / browsers.
 * @param {number|number[]} [pattern=[200,100,200]] Duration(s) in ms
 * @returns {boolean} true if vibrate was called
 */
export function vibratePattern(pattern = [200, 100, 200]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return false;
  }
  return navigator.vibrate(pattern);
}

/**
 * Combined alert: optional flash + banner + vibrate.
 * @param {string} message Banner text
 * @param {object} [opts]
 * @param {boolean} [opts.flash=true]
 * @param {boolean} [opts.banner=true]
 * @param {boolean} [opts.vibrate=true]
 * @param {"info"|"warn"|"urgent"} [opts.level="warn"]
 * @param {string} [opts.flashColor]
 * @param {number|number[]} [opts.vibratePattern]
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
  } = opts;

  const flashColors = {
    info: "#64b5f6",
    warn: "#ffeb3b",
    urgent: "#ef5350",
  };

  const tasks = [];
  if (flash) {
    tasks.push(
      flashScreen({
        color: flashColor || flashColors[level] || flashColors.warn,
      })
    );
  }

  let bannerEl = null;
  if (banner) {
    bannerEl = await showBanner(message, { level });
  }

  let vibrated = false;
  if (vibrate) {
    vibrated = vibratePattern(vPattern);
  }

  await Promise.all(tasks);
  return { banner: bannerEl, vibrated };
}

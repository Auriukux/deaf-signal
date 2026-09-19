// @ts-nocheck
/**
 * High-contrast page banner.
 * @module deaf-signal/banner
 */

const DEFAULT_BANNER_MS = 3000;

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
 * @param {boolean} [opts.focusClose=false] Move keyboard focus to the close button after open
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
    focusClose = false,
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

    clearBannerAutoDismissTimer();
    const existing = document.getElementById("deaf-signal-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "deaf-signal-banner";
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
    if (focusClose === true) {
      try {
        close.focus();
      } catch {
        /* ignore */
      }
    }
    resolve(banner);
  });
}

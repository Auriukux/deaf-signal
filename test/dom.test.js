/**
 * jsdom DOM-path tests for visual cue helpers (flash / banner / shake / pulse / notify).
 * Practical regression coverage — not a full browser e2e suite.
 */
import { afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

/** @type {import("jsdom").JSDOM} */
let dom;

function installDom() {
  dom = new JSDOM(
    `<!DOCTYPE html><html lang="en"><head></head><body>
      <main id="app"><div id="target" class="card">Hello</div></main>
    </body></html>`,
    {
      url: "https://example.test/demo.html",
      pretendToBeVisual: true,
    }
  );
  const { window } = dom;
  // Node ESM modules read these at call time
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.navigator = window.navigator;
  globalThis.Element = window.Element;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  // matchMedia: default no reduced motion
  window.matchMedia = (query) => ({
    matches: String(query).includes("prefers-reduced-motion: reduce") ? false : false,
    media: String(query),
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
  // jsdom lacks WAAPI animate — CSS fallback + timeout path is fine
  if (!window.Element.prototype.animate) {
    // leave undefined so shakeElement uses CSS animation + safety timeout
  }
}

before(() => {
  installDom();
});

afterEach(() => {
  // Clear leftover overlays / banners between cases
  for (const id of ["deaf-signal-flash", "deaf-signal-banner", "deaf-signal-shake-style"]) {
    document.getElementById(id)?.remove();
  }
  // Reset target inline styles
  const t = document.getElementById("target");
  if (t) {
    t.removeAttribute("style");
  }
});

// Dynamic import AFTER globals exist (module may already be cached from api.test.js —
// functions read document/window at call time, which is what we need).
const signals = await import("../src/signals.js");
const notify = await import("../src/notify.js");

const {
  flashScreen,
  showBanner,
  shakeElement,
  pulseBorder,
  resetFlashRateLimit,
} = signals;
const { notifyAlert } = notify;

describe("DOM: flashScreen", () => {
  it("creates a viewport flash overlay then removes it", async () => {
    resetFlashRateLimit();
    const p = flashScreen({ durationMs: 40, color: "#ffffff", opacity: 0.7 });
    const el = document.getElementById("deaf-signal-flash");
    assert.ok(el, "flash overlay should exist while flashing");
    assert.equal(el.getAttribute("aria-hidden"), "true");
    assert.match(String(el.style.background), /#ffffff|rgb\(255,\s*255,\s*255\)/i);
    await p;
    assert.equal(document.getElementById("deaf-signal-flash"), null);
  });

  it("skips when reduceMotion is true", async () => {
    resetFlashRateLimit();
    await flashScreen({ durationMs: 40, reduceMotion: true, color: "#ff0000" });
    assert.equal(document.getElementById("deaf-signal-flash"), null);
  });
});

describe("DOM: showBanner", () => {
  it("opens a role=alert banner and auto-dismisses", async () => {
    const banner = await showBanner("Test cue", { level: "warn", durationMs: 50 });
    assert.ok(banner);
    assert.equal(banner.id, "deaf-signal-banner");
    assert.equal(banner.getAttribute("role"), "alert");
    assert.match(banner.textContent, /Test cue/);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(document.getElementById("deaf-signal-banner"), null);
  });

  it("close button clears timer and removes banner", async () => {
    const banner = await showBanner("Stay briefly", { durationMs: 5000 });
    assert.ok(banner);
    const close = banner.querySelector("button");
    assert.ok(close);
    assert.equal(close.getAttribute("aria-label"), "Close");
    close.click();
    assert.equal(document.getElementById("deaf-signal-banner"), null);
    // Replacing with a short banner must still work (timer was cleared, no leak hang)
    const b2 = await showBanner("Again", { durationMs: 40 });
    assert.ok(b2);
    await new Promise((r) => setTimeout(r, 70));
    assert.equal(document.getElementById("deaf-signal-banner"), null);
  });
});

describe("DOM: shakeElement", () => {
  it("shakes a target and resolves true when finished", async () => {
    const el = document.getElementById("target");
    assert.ok(el);
    const ok = await shakeElement(el, { durationMs: 40, amplitudePx: 12 });
    assert.equal(ok, true);
    // styles cleaned up
    assert.equal(el.style.animation, "");
  });

  it("resolves false for missing selector", async () => {
    const ok = await shakeElement("#does-not-exist", { durationMs: 20 });
    assert.equal(ok, false);
  });
});

describe("DOM: pulseBorder overlap cancel", () => {
  it("second pulse cancels/replaces the first on the same element", async () => {
    const el = document.getElementById("target");
    assert.ok(el);
    const first = pulseBorder(el, { times: 4, durationMs: 400, color: "#00ff00" });
    // Let first tick apply an outline
    await new Promise((r) => setTimeout(r, 20));
    const outlineDuring = el.style.outline;
    assert.ok(outlineDuring.length > 0 || el.style.outlineOffset === "2px");

    const second = pulseBorder(el, { times: 2, durationMs: 80, color: "#ff00ff" });
    // First should settle (aborted/replaced) without hanging
    await Promise.race([
      first,
      new Promise((_, rej) => setTimeout(() => rej(new Error("first pulse hung")), 200)),
    ]);
    await second;
    // Cleaned up after second finishes
    assert.equal(el.style.outline, "");
  });
});

describe("DOM: notifyAlert smoke", () => {
  it("runs visible cues when Notification API is absent", async () => {
    resetFlashRateLimit();
    // Ensure no Notification constructor (jsdom may or may not ship one)
    const had = "Notification" in window;
    const prev = window.Notification;
    try {
      // @ts-ignore
      delete window.Notification;
      // Also hide on globalThis if mirrored
      if ("Notification" in globalThis) {
        try {
          delete globalThis.Notification;
        } catch {
          /* ignore */
        }
      }

      const result = await notifyAlert("Smoke alert", {
        body: "visible path",
        flash: true,
        shake: false,
        combo: false,
        notification: false,
        durationMs: 40,
      });
      assert.equal(result.visibleCues, true);
      assert.equal(result.notification, null);
      // permission string is "unsupported" or similar when API missing
      assert.equal(typeof result.permission, "string");
    } finally {
      if (had) window.Notification = prev;
    }
  });

  it("smoke with mocked Notification when permission granted", async () => {
    resetFlashRateLimit();
    const constructed = [];
    class FakeNotification {
      constructor(title, options) {
        this.title = title;
        this.options = options;
        constructed.push(this);
      }
      static permission = "granted";
      static requestPermission() {
        return Promise.resolve("granted");
      }
    }
    window.Notification = FakeNotification;
    globalThis.Notification = FakeNotification;

    const result = await notifyAlert("Granted alert", {
      body: "mock",
      flash: false,
      shake: false,
      combo: false,
      icon: false,
      silent: true,
    });
    assert.equal(result.permission, "granted");
    assert.equal(result.visibleCues, true);
    assert.ok(result.notification === constructed[0] || constructed.length >= 1);
    assert.equal(constructed[0].title, "Granted alert");
  });
});

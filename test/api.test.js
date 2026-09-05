/**
 * Node-side unit tests for pure helpers (no DOM / jsdom).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  PRESETS,
  getPreset,
  PATTERN_CALL,
  PATTERN_MESSAGE,
  PATTERN_URGENT,
} from "../src/presets.js";

import {
  ALERTS,
  ALERT_CALL,
  ALERT_MESSAGE,
  ALERT_DOOR,
  ALERT_SIREN,
  ALERT_HORN,
  ALERT_URGENT,
  getAlert,
  runAlert,
} from "../src/alerts.js";

import {
  contrastFlashColor,
  isVibrateSupported,
  clampShakeAmplitude,
  SHAKE_AMPLITUDE_MIN,
  SHAKE_AMPLITUDE_MAX,
  settleFlashResolve,
  defaultBannerCloseLabel,
  FLASH_RATE_MAX,
  FLASH_RATE_WINDOW_MS,
  FLASH_MIN_GAP_MS,
  resetFlashRateLimit,
  canStartFlash,
  noteFlashStart,
} from "../src/signals.js";

import { resolveNotifyIcon } from "../src/notify.js";

import {
  isListenSupported,
  getInputLevel,
  DEFAULT_LOUD_THRESHOLD,
  DEFAULT_MIN_INTERVAL_MS,
  DEFAULT_LOUD_ALERT,
  resolveLoudAlertName,
  startLoudListen,
  stopLoudListen,
} from "../src/listen.js";

describe("presets / getPreset", () => {
  it("exposes PRESETS for call, message, urgent", () => {
    assert.deepEqual(PRESETS.call, PATTERN_CALL);
    assert.deepEqual(PRESETS.message, PATTERN_MESSAGE);
    assert.deepEqual(PRESETS.urgent, PATTERN_URGENT);
    assert.equal(Object.keys(PRESETS).length, 3);
  });

  it("getPreset returns patterns case-insensitively", () => {
    assert.deepEqual(getPreset("call"), PATTERN_CALL);
    assert.deepEqual(getPreset("MESSAGE"), PATTERN_MESSAGE);
    assert.deepEqual(getPreset("Urgent"), PATTERN_URGENT);
  });

  it("getPreset returns undefined for unknown / null", () => {
    assert.equal(getPreset("nope"), undefined);
    assert.equal(getPreset(null), undefined);
    assert.equal(getPreset(undefined), undefined);
  });

  it("getPreset returns a copy, not the shared PATTERN_* reference", () => {
    const call = getPreset("call");
    assert.ok(Array.isArray(call));
    assert.deepEqual(call, PATTERN_CALL);
    assert.notEqual(call, PATTERN_CALL);
    assert.notEqual(call, PRESETS.call);
    call[0] = 9999;
    assert.equal(PATTERN_CALL[0], 300);
    assert.equal(PRESETS.call[0], 300);

    const msg = getPreset("message");
    assert.notEqual(msg, PATTERN_MESSAGE);
    msg.push(1);
    assert.equal(PATTERN_MESSAGE.length, 3);
  });
});

describe("alerts / getAlert", () => {
  it("exports ALERT_* presets and ALERTS map", () => {
    assert.equal(ALERT_CALL.name, "call");
    assert.equal(ALERT_MESSAGE.name, "message");
    assert.equal(ALERT_DOOR.name, "door");
    assert.equal(ALERT_SIREN.name, "siren");
    assert.equal(ALERT_HORN.name, "horn");
    assert.equal(ALERT_URGENT.name, "urgent");
    assert.equal(ALERTS.call, ALERT_CALL);
    assert.equal(ALERTS.siren, ALERT_SIREN);
    assert.ok(Array.isArray(ALERT_CALL.vibratePattern));
  });

  it("getAlert looks up by name", () => {
    assert.equal(getAlert("door"), ALERT_DOOR);
    assert.equal(getAlert("SIREN"), ALERT_SIREN);
    assert.equal(getAlert("missing"), undefined);
    assert.equal(getAlert(null), undefined);
  });

  it("every ALERT_* has shake durationMs/amplitudePx and banner durationMs", () => {
    const all = [
      ALERT_CALL,
      ALERT_MESSAGE,
      ALERT_DOOR,
      ALERT_SIREN,
      ALERT_HORN,
      ALERT_URGENT,
    ];
    for (const a of all) {
      assert.ok(a.shake, `${a.name} missing shake`);
      assert.equal(typeof a.shake.durationMs, "number", `${a.name} shake.durationMs`);
      assert.equal(typeof a.shake.amplitudePx, "number", `${a.name} shake.amplitudePx`);
      assert.equal(typeof a.durationMs, "number", `${a.name} durationMs`);
      assert.ok(a.durationMs > 0);
    }
    assert.ok(ALERT_SIREN.durationMs > ALERT_MESSAGE.durationMs);
    assert.ok(ALERT_HORN.durationMs > ALERT_MESSAGE.durationMs);
  });

  it("ALERT_SIREN / ALERT_HORN use presentation copy (not detection)", () => {
    assert.equal(ALERT_SIREN.message, "Urgent alert");
    assert.equal(ALERT_HORN.message, "Loud alert cue");
    assert.match(ALERT_SIREN.body, /presentation/i);
    assert.match(ALERT_HORN.body, /presentation/i);
    assert.doesNotMatch(ALERT_SIREN.message, /detect/i);
    assert.doesNotMatch(ALERT_HORN.message, /detect/i);
  });

  it("runAlert returns preset (combo no-ops without DOM) and wires known names", async () => {
    const r = await runAlert("siren");
    assert.equal(r.alert, ALERT_SIREN);
    assert.ok(r.combo);
    assert.equal(r.notification, null);
  });

  it("runAlert unknown name returns false and console.warn (fail-closed)", async () => {
    const warnings = [];
    const prev = console.warn;
    console.warn = (...args) => {
      warnings.push(args.map(String).join(" "));
    };
    try {
      const miss = await runAlert("nope");
      assert.equal(miss, false);
      assert.ok(warnings.some((w) => /unknown alert/i.test(w)));
    } finally {
      console.warn = prev;
    }
  });
});

describe("signals pure helpers", () => {
  it("isVibrateSupported returns a boolean (false in Node)", () => {
    const v = isVibrateSupported();
    assert.equal(typeof v, "boolean");
    assert.equal(v, false);
  });

  it("contrastFlashColor falls back without DOM (dark to white)", () => {
    const color = contrastFlashColor();
    assert.equal(color, "#ffffff");
  });

  it("clampShakeAmplitude uses honest 2–64 range", () => {
    assert.equal(SHAKE_AMPLITUDE_MIN, 2);
    assert.equal(SHAKE_AMPLITUDE_MAX, 64);
    assert.equal(clampShakeAmplitude(16), 16);
    assert.equal(clampShakeAmplitude(14), 14);
    assert.equal(clampShakeAmplitude(18), 18);
    assert.equal(clampShakeAmplitude(1), 2);
    assert.equal(clampShakeAmplitude(100), 64);
    assert.equal(clampShakeAmplitude(undefined), 16);
    assert.equal(clampShakeAmplitude("nope"), 16);
    assert.equal(clampShakeAmplitude(10), 10);
    assert.equal(clampShakeAmplitude(32), 32);
  });

  it("settleFlashResolve invokes prior resolve so overlapping flashes do not hang", () => {
    let called = 0;
    const prev = () => {
      called += 1;
    };
    assert.equal(settleFlashResolve(prev), null);
    assert.equal(called, 1);
    assert.equal(settleFlashResolve(null), null);
    assert.equal(settleFlashResolve(undefined), null);
    assert.equal(called, 1);
  });

  it("flash rate-limit allows at most FLASH_RATE_MAX starts per window (WCAG-minded)", () => {
    resetFlashRateLimit();
    assert.equal(FLASH_RATE_MAX, 2);
    assert.equal(FLASH_RATE_WINDOW_MS, 1000);
    assert.equal(FLASH_MIN_GAP_MS, 400);
    const t0 = 1_000_000;
    assert.equal(canStartFlash(t0), true);
    // Query alone must not mutate — still allowed before noteFlashStart
    assert.equal(canStartFlash(t0), true);
    noteFlashStart(t0);
    // Too soon for min gap
    assert.equal(canStartFlash(t0 + 100), false);
    // After min gap, second flash ok
    assert.equal(canStartFlash(t0 + FLASH_MIN_GAP_MS), true);
    noteFlashStart(t0 + FLASH_MIN_GAP_MS);
    // Third within window blocked
    assert.equal(canStartFlash(t0 + FLASH_MIN_GAP_MS + FLASH_MIN_GAP_MS), false);
    // After window rolls past first flash, a new one may start
    const later = t0 + FLASH_RATE_WINDOW_MS + FLASH_MIN_GAP_MS;
    assert.equal(canStartFlash(later), true);
    resetFlashRateLimit();
    assert.equal(canStartFlash(later), true);
  });

  it("defaultBannerCloseLabel is Close without lt html lang (Node)", () => {
    assert.equal(defaultBannerCloseLabel(), "Close");
  });

  it("defaultBannerCloseLabel uses Uždaryti when html lang is lt", () => {
    const prevDoc = globalThis.document;
    globalThis.document = { documentElement: { lang: "lt-LT" } };
    try {
      assert.equal(defaultBannerCloseLabel(), "Uždaryti");
    } finally {
      if (prevDoc === undefined) delete globalThis.document;
      else globalThis.document = prevDoc;
    }
  });
});

describe("notify icon helper", () => {
  it("resolveNotifyIcon: false / omitted / null skip; string kept", () => {
    assert.equal(resolveNotifyIcon(false), undefined);
    assert.equal(resolveNotifyIcon("/my-icon.png"), "/my-icon.png");
    assert.equal(resolveNotifyIcon(undefined), undefined);
    assert.equal(resolveNotifyIcon(null), undefined);
    assert.equal(resolveNotifyIcon(""), undefined);
  });

  it("resolveNotifyIcon does not invent a default icon from page baseURI", () => {
    const prevDoc = globalThis.document;
    globalThis.document = { baseURI: "https://example.com/examples/demo.html" };
    try {
      assert.equal(resolveNotifyIcon(undefined), undefined);
    } finally {
      if (prevDoc === undefined) delete globalThis.document;
      else globalThis.document = prevDoc;
    }
  });
});

describe("listen helpers", () => {
  it("exports DEFAULT_LOUD_THRESHOLD = 0.25", () => {
    assert.equal(DEFAULT_LOUD_THRESHOLD, 0.25);
    assert.equal(DEFAULT_MIN_INTERVAL_MS, 2500);
    assert.equal(DEFAULT_LOUD_ALERT, "urgent");
  });

  it("resolveLoudAlertName: default urgent, false/unknown skip, product → urgent", () => {
    assert.equal(resolveLoudAlertName(undefined), "urgent");
    assert.equal(resolveLoudAlertName(null), "urgent");
    assert.equal(resolveLoudAlertName(false), null);
    assert.equal(resolveLoudAlertName("urgent"), "urgent");
    // Mic must not wire to product classifier names → remap to urgent
    assert.equal(resolveLoudAlertName("siren"), "urgent");
    assert.equal(resolveLoudAlertName("door"), "urgent");
    assert.equal(resolveLoudAlertName("horn"), "urgent");
    assert.equal(resolveLoudAlertName("call"), "urgent");
    assert.equal(resolveLoudAlertName("message"), "urgent");
    assert.equal(resolveLoudAlertName("SIREN"), "urgent");
    // Unknown names skip alert entirely (true fail-closed — no urgent fire)
    assert.equal(resolveLoudAlertName("nope"), null);
    assert.equal(resolveLoudAlertName("custom-alert"), null);
  });

  it("isListenSupported is false in Node; getInputLevel null when idle", () => {
    assert.equal(typeof isListenSupported(), "boolean");
    assert.equal(isListenSupported(), false);
    assert.equal(getInputLevel(), null);
  });

  it("startLoudListen stops tracks if AudioContext construction throws", async () => {
    let stopCount = 0;
    const track = {
      kind: "audio",
      stop() {
        stopCount += 1;
      },
    };
    const stream = {
      getTracks() {
        return [track];
      },
    };

    const prevWindow = globalThis.window;
    const prevNavDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

    globalThis.window = {
      isSecureContext: true,
      AudioContext: function AudioContext() {
        throw new Error("AudioContext boom");
      },
      addEventListener() {},
      removeEventListener() {},
    };
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      writable: true,
      value: {
        mediaDevices: {
          async getUserMedia() {
            return stream;
          },
        },
      },
    });

    try {
      await assert.rejects(
        () => startLoudListen({ alert: false }),
        (err) => {
          assert.match(String(err && err.message), /AudioContext boom/);
          return true;
        }
      );
      assert.equal(stopCount, 1, "media track should be stopped on setup failure");
      assert.equal(getInputLevel(), null);
    } finally {
      try {
        stopLoudListen();
      } catch (_) {}
      if (prevWindow === undefined) delete globalThis.window;
      else globalThis.window = prevWindow;
      if (prevNavDesc) {
        Object.defineProperty(globalThis, "navigator", prevNavDesc);
      } else {
        delete globalThis.navigator;
      }
    }
  });
});

describe("package root public API", () => {
  it("does not re-export flash rate-limit test helpers", async () => {
    const root = await import("../src/index.js");
    assert.equal("resetFlashRateLimit" in root, false);
    assert.equal("canStartFlash" in root, false);
    assert.equal("noteFlashStart" in root, false);
    const signals = await import("../src/signals.js");
    assert.equal(typeof signals.resetFlashRateLimit, "function");
    assert.equal(typeof signals.canStartFlash, "function");
    assert.equal(typeof signals.noteFlashStart, "function");
  });
});

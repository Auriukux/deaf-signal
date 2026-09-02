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
} from "../src/signals.js";

import {
  isListenSupported,
  getInputLevel,
  DEFAULT_LOUD_THRESHOLD,
  DEFAULT_MIN_INTERVAL_MS,
  DEFAULT_LOUD_ALERT,
  resolveLoudAlertName,
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

  it("runAlert returns preset (combo no-ops without DOM) and wires known names", async () => {
    const r = await runAlert("siren");
    assert.equal(r.alert, ALERT_SIREN);
    assert.ok(r.combo);
    assert.equal(r.notification, null);

    const miss = await runAlert("nope");
    assert.equal(miss.alert, null);
    assert.equal(miss.combo, null);
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
});

describe("listen helpers", () => {
  it("exports DEFAULT_LOUD_THRESHOLD = 0.25", () => {
    assert.equal(DEFAULT_LOUD_THRESHOLD, 0.25);
    assert.equal(DEFAULT_MIN_INTERVAL_MS, 2500);
    assert.equal(DEFAULT_LOUD_ALERT, "urgent");
  });

  it("resolveLoudAlertName: default urgent, false skips, custom passes", () => {
    assert.equal(resolveLoudAlertName(undefined), "urgent");
    assert.equal(resolveLoudAlertName(null), "urgent");
    assert.equal(resolveLoudAlertName(false), null);
    assert.equal(resolveLoudAlertName("siren"), "siren");
    assert.equal(resolveLoudAlertName("urgent"), "urgent");
  });

  it("isListenSupported is false in Node; getInputLevel null when idle", () => {
    assert.equal(typeof isListenSupported(), "boolean");
    assert.equal(isListenSupported(), false);
    assert.equal(getInputLevel(), null);
  });
});

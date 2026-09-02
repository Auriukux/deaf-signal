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
} from "../src/alerts.js";

import { contrastFlashColor, isVibrateSupported } from "../src/signals.js";

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
});

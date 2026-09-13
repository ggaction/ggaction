import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeMarkLabelPlacement,
  resolveMarkLabelPlacement
} from "../../../src/layout/labels.js";

const text = Object.freeze({
  text: "10",
  fontSize: 10,
  fontFamily: "sans-serif",
  fontWeight: "normal",
  textAlign: "center",
  textBaseline: "middle",
  rotation: 0,
  dx: 0,
  dy: 0
});

function interval({ start, end, bounds }) {
  const delta = { x: end.x - start.x, y: end.y - start.y };
  const length = Math.hypot(delta.x, delta.y) || 1;
  const outward = { x: delta.x / length, y: delta.y / length };
  return {
    kind: "interval",
    center: {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2
    },
    start: {
      point: start,
      outward: { x: -outward.x, y: -outward.y }
    },
    end: { point: end, outward },
    bounds
  };
}

test("places positive and negative vertical labels by the nearest bbox edge", () => {
  const positive = resolveMarkLabelPlacement({
    placement: { anchor: "outsideEnd" },
    geometry: interval({
      start: { x: 50, y: 100 },
      end: { x: 50, y: 20 },
      bounds: { left: 40, right: 60, top: 20, bottom: 100 }
    }),
    text
  });
  const negative = resolveMarkLabelPlacement({
    placement: { anchor: "outsideEnd" },
    geometry: interval({
      start: { x: 50, y: 20 },
      end: { x: 50, y: 100 },
      bounds: { left: 40, right: 60, top: 20, bottom: 100 }
    }),
    text
  });

  assert.equal(positive.bounds.bottom, 16);
  assert.equal(negative.bounds.top, 104);
  assert.deepEqual(
    { x: positive.sourceX, y: positive.sourceY },
    { x: 50, y: 20 }
  );
  assert.deepEqual(
    { x: negative.sourceX, y: negative.sourceY },
    { x: 50, y: 100 }
  );
});

test("places every horizontal interval anchor against its named boundary", () => {
  const geometry = interval({
    start: { x: 20, y: 50 },
    end: { x: 100, y: 50 },
    bounds: { left: 20, right: 100, top: 40, bottom: 60 }
  });
  const resolved = Object.fromEntries([
    "center", "insideStart", "insideEnd", "outsideStart", "outsideEnd"
  ].map(anchor => [anchor, resolveMarkLabelPlacement({
    placement: { anchor }, geometry, text
  })]));

  assert.equal(resolved.center.x, 60);
  assert.equal(resolved.insideStart.bounds.left, 24);
  assert.equal(resolved.insideEnd.bounds.right, 96);
  assert.equal(resolved.outsideStart.bounds.right, 16);
  assert.equal(resolved.outsideEnd.bounds.left, 104);
});

test("places a zero-length interval using its supplied final scale direction", () => {
  const resolved = resolveMarkLabelPlacement({
    placement: { anchor: "outsideEnd" },
    geometry: {
      kind: "interval",
      center: { x: 50, y: 100 },
      start: {
        point: { x: 50, y: 100 },
        outward: { x: 0, y: 1 }
      },
      end: {
        point: { x: 50, y: 100 },
        outward: { x: 0, y: -1 }
      },
      bounds: { left: 40, right: 60, top: 100, bottom: 100 }
    },
    text
  });
  assert.equal(resolved.visible, true);
  assert.equal(resolved.bounds.bottom, 96);
});

test("uses radial bbox support beyond an Arc boundary gap anchor", () => {
  const resolved = resolveMarkLabelPlacement({
    placement: { anchor: "outsideEnd", gap: 4 },
    geometry: {
      kind: "arc",
      centerX: 100,
      centerY: 100,
      startTheta: 0,
      endTheta: 90,
      innerRadius: 40,
      outerRadius: 80
    },
    text
  });
  const direction = Math.SQRT1_2;
  const boundaryRadius = Math.hypot(
    resolved.sourceX - 100,
    resolved.sourceY - 100
  );
  const centerRadius = Math.hypot(resolved.x - 100, resolved.y - 100);

  assert.ok(Math.abs(boundaryRadius - 80) < 1e-9);
  assert.ok(Math.abs(
    Math.hypot(
      100 + direction * 84 - 100,
      100 - direction * 84 - 100
    ) - 84
  ) < 1e-9);
  assert.ok(centerRadius > 84);
  assert.ok(Math.abs(resolved.sourceX - (100 + direction * 80)) < 1e-9);
  assert.ok(Math.abs(resolved.sourceY - (100 - direction * 80)) < 1e-9);
});

test("does not flip an Arc outside-start label through the Polar center", () => {
  const geometry = {
    kind: "arc",
    centerX: 100,
    centerY: 100,
    startTheta: 0,
    endTheta: 90,
    innerRadius: 4,
    outerRadius: 80
  };
  const hidden = resolveMarkLabelPlacement({
    placement: { anchor: "outsideStart" }, geometry, text
  });
  const allowed = resolveMarkLabelPlacement({
    placement: { anchor: "outsideStart", overflow: "allow" }, geometry, text
  });

  assert.deepEqual(hidden, {
    visible: false,
    anchor: "outsideStart",
    fallback: false
  });
  assert.equal(allowed.visible, true);
  assert.ok(allowed.x < geometry.centerX && allowed.y > geometry.centerY);
});

test("rejects an Arc center bbox whose edge crosses the inner hole", () => {
  const wideText = {
    ...text,
    text: "iiiiii",
    fontSize: 50,
    textBaseline: "top"
  };
  const hidden = resolveMarkLabelPlacement({
    placement: { anchor: "center" },
    geometry: {
      kind: "arc",
      centerX: 100,
      centerY: 100,
      startTheta: -90,
      endTheta: 90,
      innerRadius: 40,
      outerRadius: 80
    },
    text: wideText
  });
  assert.equal(hidden.visible, false);
});

test("applies hide, one-shot outside fallback, and allow to inside fit", () => {
  const geometry = interval({
    start: { x: 0, y: 10 },
    end: { x: 0, y: 0 },
    bounds: { left: -2, right: 2, top: 0, bottom: 10 }
  });
  const hide = resolveMarkLabelPlacement({
    placement: { anchor: "insideEnd" }, geometry, text
  });
  const outside = resolveMarkLabelPlacement({
    placement: { anchor: "insideEnd", overflow: "outside" }, geometry, text
  });
  const allow = resolveMarkLabelPlacement({
    placement: { anchor: "insideEnd", overflow: "allow" }, geometry, text
  });

  assert.deepEqual(hide, { visible: false, anchor: "insideEnd", fallback: false });
  assert.equal(outside.visible, true);
  assert.equal(outside.anchor, "outsideEnd");
  assert.equal(outside.fallback, true);
  assert.equal(allow.visible, true);
  assert.equal(allow.anchor, "insideEnd");
  assert.equal(allow.fallback, false);
});

test("normalizes immutable defaults and rejects invalid placement values", () => {
  const input = Object.freeze({
    anchor: "outsideEnd",
    leader: Object.freeze({ stroke: "#123456", strokeWidth: 2 })
  });
  const normalized = normalizeMarkLabelPlacement(input);
  assert.deepEqual(normalized, {
    anchor: "outsideEnd",
    gap: 4,
    overflow: "hide",
    leader: { stroke: "#123456", strokeWidth: 2 }
  });
  assert.ok(Object.isFrozen(normalized));
  assert.deepEqual(input, {
    anchor: "outsideEnd",
    leader: { stroke: "#123456", strokeWidth: 2 }
  });
  for (const value of [
    {},
    { anchor: "edge" },
    { anchor: "center", gap: -1 },
    { anchor: "center", overflow: "clip" },
    { anchor: "center", leader: { strokeWidth: -1 } },
    { anchor: "center", unknown: true }
  ]) assert.throws(() => normalizeMarkLabelPlacement(value));
});

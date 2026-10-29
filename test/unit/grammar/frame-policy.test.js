import assert from "node:assert/strict";
import test from "node:test";
import { assertSingleYFrames } from "../../../src/grammar/framePolicy.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";

const frame = (id = "plot", patch = {}) => ({ id, region: { x: 0, y: 0, width: 100, height: 80 },
  bindings: [{ owner: "points:y", scale: "height" }], guides: [{ id: "left", scale: "height", visible: true }], ...patch });

test("shares one Y identity across layers and the y2 range endpoint", () => {
  const input = [frame("plot", { bindings: [{ owner: "points:y", scale: "height" },
    { owner: "range:y", scale: "height" }, { owner: "range:y2", scale: "height" }] })];
  const before = structuredClone(input);
  assertSingleYFrames(input);
  assert.deepEqual(input, before);
  assertSingleYFrames([]);
  assertSingleYFrames([frame("incomplete", { bindings: [], guides: [] })]);
});

test("rejects equal-domain independent identities and scales behind hidden guides", () => {
  for (const patch of [
    { bindings: [{ owner: "points:y", scale: "a" }, { owner: "line:y", scale: "b" }], guides: [] },
    { guides: [{ id: "hidden", scale: "independent", visible: false }] }
  ]) {
    assert.throws(() => assertSingleYFrames([frame("plot", patch)]), error => {
      assert.match(error.message, /frame "plot" requires one Y scale/);
      const detail = getErrorDetails(error);
      assert.equal(detail.resourceId, "plot");
      assert.equal(detail.candidates.length, 2);
      return true;
    });
  }
});

test("rejects mirrored visible owners while retaining one hidden owner with the same mapping", () => {
  const guides = [{ id: "left", scale: "height", visible: true }, { id: "right", scale: "height", visible: true }];
  assert.throws(() => assertSingleYFrames([frame("plot", { guides })]), /visible Y guide: left, right/);
  assertSingleYFrames([frame("plot", { guides: guides.map(guide => ({ ...guide, visible: false })) })]);
  assertSingleYFrames([frame("plot", { guides: [guides[0], guides[0]] })]);
});

test("allows adjacent and separated panels but rejects positive independent frame overlap", () => {
  for (const region of [{ x: 100, y: 0, width: 100, height: 80 }, { x: 0, y: 80, width: 100, height: 80 },
    { x: -110, y: 0, width: 100, height: 80 }, { x: 50, y: 100, width: 100, height: 80 }]) {
    assertSingleYFrames([frame("a"), frame("b", { region })]);
  }
  for (const region of [{ x: 0, y: 0, width: 100, height: 80 }, { x: 99, y: 79, width: 100, height: 80 },
    { x: 10, y: 10, width: 1, height: 1 }]) {
    assert.throws(() => assertSingleYFrames([frame("a"), frame("b", { region })]), /overlaps.*a, b/);
  }
  assertSingleYFrames([frame("a"), frame("annotation", { bindings: [], guides: [] })]);
  assertSingleYFrames([frame("a"), frame("empty", { region: { x: 0, y: 0, width: 0, height: 80 } })]);
});

test("validates explicit descriptor shape, identity, finite regions and dense bounded arrays", () => {
  const invalid = [null, { region: {} }, { id: "" }, { id: 1 }, { extra: true }, { region: null },
    { region: { x: 0, y: 0, width: -1, height: 1 } }, { region: { x: 0, y: 0, width: Infinity, height: 1 } },
    { region: { x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 1 } },
    { bindings: [null] }, { bindings: [{ owner: "", scale: "height" }] }, { bindings: [{ owner: "a" }] },
    { bindings: new Array(2) }, { guides: {} }, { guides: [{ id: "x", scale: "height" }] },
    { guides: [{ id: "", scale: "height", visible: true }] }, { guides: [{ id: "x", scale: "", visible: true }] }];
  for (const patch of invalid) assert.throws(() => assertSingleYFrames([patch === null ? null : frame("plot", patch)]));
  for (const input of [undefined, {}, new Array(2), Array(10_001).fill(frame())]) assert.throws(() => assertSingleYFrames(input));
  assert.throws(() => assertSingleYFrames([frame(), frame()]), /Duplicate/);
});

test("keeps ten thousand narrow panels bounded in either layout direction", () => {
  for (const vertical of [false, true]) {
    const frames = Array.from({ length: 10_000 }, (_, index) => frame(`panel:${index}`, {
      region: { x: vertical ? 0 : index * 2, y: vertical ? index * 2 : 0, width: 1, height: 1 }
    }));
    assertSingleYFrames(frames);
  }
});

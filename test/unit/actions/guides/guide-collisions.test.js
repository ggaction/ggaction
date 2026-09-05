import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { unionConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { assertGuideCollisionBlocks } from "../../../../src/layout/guideCollisions.js";

const kinds = ["color", "series", "gradient", "interval", "size", "opacity", "strokeWidth"];
const edges = ["left", "right", "top", "bottom"];
function base(kind, create = chart) {
  let p = create().createCanvas({ width: 1200, height: 1000, margin: 300 })
    .createData({ values: [{ x: 0, y: 0, m: 0, g: "A" }, { x: 10, y: 10, m: 10, g: "B" },
      { x: 5, y: 4, m: 0, g: "A" }, { x: 6, y: 3, m: 10, g: "B" }] });
  p = kind === "strokeWidth" ? p.createLineMark() : p.createPointMark();
  p = p.encodeX({ field: "x" }).encodeY({ field: "y" });
  if (kind === "strokeWidth") p = p.encodeGroup({ field: "g" });
  if (kind === "series") return p.encodeShape({ field: "g" });
  if (kind === "color") return p.encodeColor({ field: "g" });
  if (kind === "gradient" || kind === "interval") return p.encodeColor({ field: "m", fieldType: "quantitative",
    ...(kind === "interval" ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) });
  return p[{ size: "encodeSize", opacity: "encodeOpacity", strokeWidth: "encodeStrokeWidth" }[kind]]({ field: "m" });
}
const side = position => ["left", "right"].includes(position);
const axis = position => side(position) ? "Y" : "X";
function legendBounds(p) {
  return unionConcreteGraphicBounds(p.graphicSpec, Object.keys(p.graphicSpec.objects)
    .filter(id => id.includes("Legend") || id.startsWith("colorGradient")));
}
function overlappingAxis(p, position) {
  const b = legendBounds(p), x = (b.left + b.right) / 2, y = (b.top + b.bottom) / 2;
  return { position, text: "AXIS", fontSize: 24,
    offset: Math.abs(side(position) ? x - (position === "left" ? 300 : 900) : y - (position === "top" ? 300 : 700)),
    at: side(position) ? (700 - y) / 40 : (x - 300) / 60 };
}
const safeAxis = position => ({ position, text: "AXIS", fontSize: 6, offset: 5 });
function rejectsWithoutMutation(program, apply) {
  const before = JSON.stringify(program);
  const context = program.context;
  assert.throws(() => apply(program), /overlap.*margin space/);
  assert.equal(JSON.stringify(program), before);
  assert.strictEqual(program.context, context);
  assert.equal(Object.hasOwn(program.context, "deferGuideLayoutValidation"), false);
}

test("all legend families reject axis collisions in either creation order, with separated positive controls", () => {
  for (const create of [chart, basicChart]) for (const kind of kinds) {
    if (create === basicChart && ["strokeWidth", "opacity"].includes(kind)) continue;
    for (const position of edges) {
      const src = base(kind, create), legend = src.createLegend({ position, offset: 40, border: true });
      const method = `create${axis(position)}AxisTitle`, overlap = overlappingAxis(legend, position);
      rejectsWithoutMutation(legend, p => p[method](overlap));
      const titled = src[method](overlap);
      rejectsWithoutMutation(titled, p => p.createLegend({ position, offset: 40, border: true }));
      const forward = legend[method](safeAxis(position));
      const reverse = src[method](safeAxis(position)).createLegend({ position, offset: 40, border: true });
      assert.deepEqual(forward.graphicSpec, reverse.graphicSpec);
      assert.equal(Object.hasOwn(forward.context, "deferGuideLayoutValidation"), false);
    }
  }
});

test("all legend families reject rotated or horizontal chart-title collisions symmetrically", () => {
  for (const kind of kinds) for (const position of edges) {
    const src = base(kind), legend = src.createLegend({ position, offset: 40, border: true });
    const b = legendBounds(legend), x = (b.left + b.right) / 2, y = (b.top + b.bottom) / 2;
    const offset = position === "left" ? x - 22 : position === "right" ? x - 1178
      : position === "top" ? y - 22 : y - 706;
    const options = { position, align: side(position) ? "left" : "center", text: "Guide reference ".repeat(3),
      offset, titleStyle: { fontSize: 12 } };
    rejectsWithoutMutation(legend, p => p.createTitle(options));
    rejectsWithoutMutation(src.createTitle(options), p => p.createLegend({ position, offset: 40, border: true }));
    const safe = { ...options, offset: position === "bottom" ? 240 : 0 };
    assert.deepEqual(legend.createTitle(safe).graphicSpec,
      src.createTitle(safe).createLegend({ position, offset: 40, border: true }).graphicSpec);
  }
});

test("focused and whole-axis edits validate the final guide state without leaking transaction context", () => {
  for (const kind of kinds) for (const position of edges) {
    const src = base(kind), legend = src.createLegend({ position, offset: 40, border: true });
    const create = `create${axis(position)}AxisTitle`, edit = `edit${axis(position)}AxisTitle`;
    const overlap = overlappingAxis(legend, position);
    const p = legend[create](safeAxis(position));
    rejectsWithoutMutation(p, next => next[edit](overlap));
    const { position: _position, ...title } = overlap;
    rejectsWithoutMutation(p, next => next[`edit${axis(position)}Axis`]({ title }));
    const canvas = position === "left" ? { margin: { left: 260 } } : position === "right" ? { width: 1240 }
      : position === "top" ? { margin: { top: 260 } } : { height: 1040 };
    // The new axis can intersect the old legend while both final positions fit.
    assert.deepEqual(p.editCanvas(canvas).graphicSpec,
      src.editCanvas(canvas).createLegend({ position, offset: 40, border: true })[create](safeAxis(position)).graphicSpec);
    assert.deepEqual(p.editScale({ id: side(position) ? "y" : "x", domain: [-10, 20] }).graphicSpec,
      src.editScale({ id: side(position) ? "y" : "x", domain: [-10, 20] })
        .createLegend({ position, offset: 40, border: true })[create](safeAxis(position)).graphicSpec);
    assert.equal(Object.hasOwn(p.editCanvas(canvas).context, "deferGuideLayoutValidation"), false);
  }
});

test("axis lines, ticks and labels share the final-state collision policy", () => {
  for (const position of edges) {
    const src = base("size"), p = src.createLegend({ position, offset: 40, border: true });
    for (const component of ["Line", "Ticks", "Labels"]) {
      const options = { position, ...(component === "Line" ? { lineWidth: 120 } : component === "Ticks"
        ? { length: 180, count: 3 } : { offset: 80, fontSize: 16, count: 3 }) };
      rejectsWithoutMutation(p, next => next[`create${axis(position)}Axis${component}`](options));
      const first = src[`create${axis(position)}Axis${component}`](options);
      rejectsWithoutMutation(first, next => next.createLegend({ position, offset: 40, border: true }));
    }
  }
});

test("legend edits, removal and nested combined backgrounds converge around reserved guide space", () => {
  const src = base("size").encodeColor({ field: "g" });
  const size = src.createLegend({ channels: ["size"], position: "top", count: 2, border: true });
  const combined = size.createLegend({ channels: ["color", "size"], position: "top", offset: 100, border: true });
  const title = { text: "Reserved", position: "top", align: "center", offset: 160 };
  rejectsWithoutMutation(combined, p => p.createTitle(title));
  const separate = combined.createTitle({ ...title, offset: 0 });
  rejectsWithoutMutation(separate, p => p.editTitle(title));
  assert.deepEqual(separate.removeTitle().graphicSpec, combined.graphicSpec);
  const axisTitle = src.createXAxisTitle({ position: "top", text: "AXIS", fontSize: 20, offset: 50 });
  const far = axisTitle.createLegend({ channels: ["size"], position: "top", offset: 100, border: true });
  rejectsWithoutMutation(far, p => p.editLegend({ offset: 35 }));
  rejectsWithoutMutation(far, p => p.editLegend({ channels: ["size"], offset: 35 }));
  assert.deepEqual(far.removeLegend().createLegend({ channels: ["size"], position: "top", offset: 100, border: true }).graphicSpec, far.graphicSpec);
});

test("pure guide bounds allow touching edges and unrelated positions while detecting separate legend groups", () => {
  const a = { id: "a", kind: "legend", position: "top", bounds: { left: 0, right: 10, top: 0, bottom: 10 } };
  assert.doesNotThrow(() => assertGuideCollisionBlocks([a, { ...a, id: "b", bounds: { ...a.bounds, left: 10, right: 20 } }]));
  assert.doesNotThrow(() => assertGuideCollisionBlocks([a, { ...a, id: "b", position: "bottom" }]));
  assert.throws(() => assertGuideCollisionBlocks([a, { ...a, id: "b" }]), /a and b overlap/);
  const p = base("size").createLegend();
  assert.doesNotThrow(() => p.createGraphics({ id: "intentional", type: "rect", parent: "canvas" })
    .editGraphics({ target: "intentional", property: "x", value: 900 })
    .editGraphics({ target: "intentional", property: "y", value: 300 })
    .editGraphics({ target: "intentional", property: "width", value: 200 })
    .editGraphics({ target: "intentional", property: "height", value: 200 }));
});

test("chart-title-first legends preserve explicit border and title restoration anchors", () => {
  for (const kind of kinds) for (const position of edges) {
    const src = base(kind).createTitle({ text: "Caption", offset: 0 });
    const options = { position, offset: 40 };
    const plain = src.createLegend(options);
    const direct = src.createLegend({ ...options, border: true });
    const restored = plain.editLegend({ border: true }).editLegend({ title: false }).editLegend({ title: "auto" });
    assert.deepEqual(restored.graphicSpec, direct.graphicSpec);
    assert.deepEqual(restored.editLegend({ border: false }).graphicSpec, plain.graphicSpec);
    assert.deepEqual(restored.removeLegend().graphicSpec, src.graphicSpec);
  }
});

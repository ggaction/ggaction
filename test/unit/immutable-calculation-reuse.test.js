import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { cloneAndFreeze, isOwned } from "../../src/core/immutable.js";
import { validatePathCommands } from "../../src/grammar/pathCommands.js";
import { resolvePathCommandBounds } from "../../src/grammar/schemas/graphicBounds.js";
import { validateConcreteGraphicProperties } from "../../src/grammar/schemas/concreteGraphic.js";
import { materializeParallelRows } from "../../src/grammar/parallelCoordinates.js";
import { renderToSVG } from "../../src/renderers/svg.js";

test("immutable copies preserve special keys, sparse arrays and caller isolation", () => {
  const input = JSON.parse('{"__proto__":{"polluted":true},"constructor":7,"nested":{"x":1}}');
  const owned = cloneAndFreeze(input);
  assert.equal(Object.getPrototypeOf(owned), Object.prototype);
  assert.deepEqual(Object.keys(owned), Object.keys(input));
  assert.equal(owned.__proto__.polluted, true);
  assert.equal({}.polluted, undefined);
  input.nested.x = 9;
  assert.equal(owned.nested.x, 1);
  const sparse = cloneAndFreeze([, { x: 2 }]);
  assert.equal(0 in sparse, false);
  assert.ok(isOwned(sparse[1]));
  assert.equal(cloneAndFreeze({ owned }).owned, owned);
  const cycle = {}; cycle.child = cycle;
  assert.throws(() => cloneAndFreeze(cycle), /cyclic/);
  assert.throws(() => cloneAndFreeze({ a: [() => {}] }), /state.a\[0\]/);
});

test("validation and bounds caches never trust shallow caller freezes", () => {
  const commands = Object.freeze([{ op: "M", x: 1, y: 2 }, { op: "L", x: 4, y: 6 }]);
  const owned = cloneAndFreeze(commands);
  assert.equal(validatePathCommands(owned), owned);
  const bounds = resolvePathCommandBounds(owned);
  assert.deepEqual(bounds, { left: 1, right: 4, top: 2, bottom: 6 });
  bounds.right = 99;
  assert.equal(resolvePathCommandBounds(owned).right, 4);
  validatePathCommands(commands);
  resolvePathCommandBounds(commands);
  commands[1].x = 20;
  assert.equal(resolvePathCommandBounds(commands).right, 20);
  commands[1].op = "invalid";
  assert.throws(() => validatePathCommands(commands), /command/);
  const props = Object.freeze({ commands: [{ op: "M", x: 0, y: 0 }] });
  validateConcreteGraphicProperties("path", props);
  props.commands[0].x = NaN;
  assert.throws(() => validateConcreteGraphicProperties("path", props), /finite/);
  const zero = cloneAndFreeze({ fontSize: 0 });
  const radius = cloneAndFreeze({ radius: 0 });
  validateConcreteGraphicProperties("circle", radius);
  assert.throws(() => validateConcreteGraphicProperties("line", radius));
  assert.throws(() => validateConcreteGraphicProperties("text", zero), /positive/);
});

test("parallel geometry reuses immutable inputs and invalidates all geometric dependencies", () => {
  const rows = cloneAndFreeze([{ a: 0, b: 10, id: "first" }, { a: 10, b: 0, id: "second" }]);
  const dimensions = cloneAndFreeze([
    { field: "a", fieldType: "quantitative", scale: "a" },
    { field: "b", fieldType: "quantitative", scale: "b" }
  ]);
  const scales = cloneAndFreeze({
    a: { type: "linear", domain: [0, 10], range: [100, 0] },
    b: { type: "linear", domain: [0, 10], range: [100, 0] }
  });
  const bounds = { x: 0, y: 0, width: 200, height: 100 }, options = { missing: "break" };
  const materialize = (r = rows, d = dimensions, s = scales, b = bounds, o = options) => materializeParallelRows(r, d, s, b, o);
  const first = materialize();
  assert.deepEqual(first[0].commands, [{ op: "M", x: 0, y: 100 }, { op: "L", x: 200, y: 0 }]);
  assert.equal(materialize(), first);
  assert.equal(materialize(rows, dimensions, { ...scales }), first);
  assert.notEqual(materialize(rows, dimensions, scales, { ...bounds, width: 300 }), first);
  assert.notEqual(materialize(rows, dimensions, scales, bounds, { ...options, key: "id" }), first);
  assert.notEqual(materialize(rows, dimensions, scales, bounds, { missing: "drop-row" }), first);
  assert.notEqual(materialize(rows, cloneAndFreeze([...dimensions].reverse())), first);
  const changed = cloneAndFreeze({ ...scales, a: { ...scales.a, domain: [0, 20] } });
  assert.equal(materialize(rows, dimensions, changed)[1].commands[0].y, 50);
  const mutable = structuredClone(rows);
  const before = materialize(mutable);
  mutable[0].a = 5;
  assert.notDeepEqual(materialize(mutable), before);
  assert.equal(materialize(cloneAndFreeze([...rows, { a: null, b: 4 }])).length, 3);
  assert.throws(() => materialize(cloneAndFreeze([{ a: null, b: 4 }]), dimensions, scales, bounds, { missing: "error" }), /missing dimension/);
  for (let width = 201; width <= 206; width++) materialize(rows, dimensions, scales, { ...bounds, width });
  assert.notEqual(materialize(), first, "geometry retention is bounded per row set");
  assert.deepEqual(materialize(), first);
});

test("SVG resource namespaces retain exact 64-bit hashes including Unicode", () => {
  for (const text of ["label", "한글 🦋 <&>", ""] ) {
    const program = chart().createCanvas({ margin: { top: 80, left: 80, right: 80, bottom: 80 } }).createData({ values: [{ x: 1, y: 2 }] })
      .createScatterPlot({ x: "x", y: "y" }).createTitle({ text: text || " " });
    let hash = 0xcbf29ce484222325n;
    const json = JSON.stringify(program.graphicSpec);
    for (let i = 0; i < json.length; i++) hash = BigInt.asUintN(64, (hash ^ BigInt(json.charCodeAt(i))) * 0x100000001b3n);
    const svg = renderToSVG(program);
    assert.equal(svg, renderToSVG(program, { resourceNamespace: "probe" }).replaceAll("-probe-", `-${hash.toString(36)}-`));
  }
});

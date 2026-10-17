import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

function base(factory = chart) {
  return factory().createCanvas({ width: 700, height: 500,
    margin: { left: 100, right: 100, top: 100, bottom: 100 } })
    .createData({ values: [{ x: 0, y: 0 }, { x: 1, y: 2 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
}
const overrides = Object.freeze([Object.freeze({ value: 0, strokeDash: Object.freeze([]) })]);
const patterns = p => p.graphicSpec.objects.yAxisTicks.items.map(item => item.properties.strokeDash);

test("uniform and typed overrides retain native tick/grid ownership and exact primitive output", () => {
  const original = base().createYAxis({ ticksAndLabels: { values: [0, 1, 2] } })
    .createHorizontalGrid({ values: [0, 1, 2] });
  const before = serializeProgram(original);
  const styled = original.editYAxisTicks({ strokeDash: [2, 2], strokeDashMap: overrides })
    .editHorizontalGrid({ strokeDash: [2, 2], strokeDashMap: overrides });
  const expected = [[], [2, 2], [2, 2]];
  assert.deepEqual(patterns(styled), expected);
  assert.deepEqual(styled.graphicSpec.objects.horizontalGridLines.items.map(item => item.properties.strokeDash), expected);
  const primitive = original.editGraphics({ target: "yAxisTicks", property: "strokeDash", value: expected })
    .editGraphics({ target: "horizontalGridLines", property: "strokeDash", value: expected });
  assert.deepEqual(styled.graphicSpec, primitive.graphicSpec);
  assert.equal(renderToSVG(styled), renderToSVG(primitive));
  assert.equal(serializeProgram(original), before);
  assert.equal(Object.isFrozen(overrides[0].strokeDash), true);
  assert.equal(styled.semanticSpec.layers.length, original.semanticSpec.layers.length);
});

test("complete, whole, group, focused and Basic creation converge", () => {
  const tick = { strokeDash: [4, 2], strokeDashMap: overrides };
  const expected = base().createYAxis({ ticksAndLabels: { values: [0, 1, 2], ticks: tick } });
  for (const actual of [
    base().createYAxis({ ticksAndLabels: { values: [0, 1, 2] } }).editYAxis({ ticks: tick }),
    base().createYAxis({ ticksAndLabels: { values: [0, 1, 2] } }).editYAxisTicksAndLabels({ ticks: tick }),
    base().createYAxis({ ticksAndLabels: { values: [0, 1, 2] } }).editYAxisTicks(tick),
    base(basicChart).createYAxis({ ticksAndLabels: { values: [0, 1, 2], ticks: tick } })
  ]) assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
});

test("map reset preserves uniform dash and uniform edits preserve an override map", () => {
  const p = base().createYAxis({ ticksAndLabels: { values: [0, 1, 2],
    ticks: { strokeDash: [2, 2], strokeDashMap: overrides } } });
  assert.deepEqual(patterns(p.editYAxisTicks({ strokeDash: [4, 2] })), [[], [4, 2], [4, 2]]);
  for (const reset of ["auto", []]) {
    const cleared = p.editYAxisTicks({ strokeDashMap: reset });
    assert.equal(cleared.guideConfigs.axis.y.ticks.strokeDashMap, undefined);
    assert.deepEqual(patterns(cleared), [[2, 2], [2, 2], [2, 2]]);
  }
});

test("typed categories remain distinct and maps survive Canvas/scale refresh and persistence", () => {
  const map = [{ value: 0, strokeDash: [1, 1] }, { value: "0", strokeDash: [2, 2] },
    { value: false, strokeDash: [3, 3] }, { value: 9, strokeDash: [4, 4] }];
  const p = chart().createCanvas({ width: 700, height: 500 })
    .createData({ values: [{ c: 0, v: 1 }, { c: "0", v: 2 }, { c: false, v: 3 }] })
    .createBarPlot({ x: { field: "c", fieldType: "nominal" }, y: "v", guides: false })
    .createXAxis({ ticksAndLabels: { ticks: { strokeDashMap: map } } });
  const read = p => p.graphicSpec.objects.xAxisTicks.items.map(item => item.properties.strokeDash);
  assert.deepEqual(read(p), [[1, 1], [2, 2], [3, 3]]);
  const restored = deserializeProgram(serializeProgram(p));
  assert.deepEqual(read(restored.editCanvas({ width: 800 })), read(p));
  assert.deepEqual(restored.guideConfigs.axis.x.ticks.strokeDashMap, map);
  const q = base().createYAxis({ ticksAndLabels: { values: [0, 1, 2], ticks: { strokeDashMap: map } } });
  assert.deepEqual(q.editScale({ id: "y", domain: [0, 3] }).guideConfigs.axis.y.ticks.strokeDashMap, map);
});

test("band boundaries use the first selected band style at a shared edge", () => {
  const p = chart().createCanvas({ width: 700, height: 500 })
    .createData({ values: [{ c: "A", v: 1 }, { c: "B", v: 2 }] })
    .createBarPlot({ x: "c", y: "v", guides: false })
    .editScale({ id: "x", paddingInner: 0, paddingOuter: 0 })
    .createVerticalGrid({ values: ["A", "B"], bandPosition: "boundary",
      strokeDashMap: [{ value: "A", strokeDash: [1, 1] }, { value: "B", strokeDash: [2, 2] }] });
  assert.deepEqual(p.graphicSpec.objects.verticalGridLines.items.map(item => item.properties.strokeDash),
    [[1, 1], [1, 1], [2, 2]]);
});

test("invalid dash patterns/maps and malformed stored maps fail atomically", () => {
  const p = base().createYAxis().createHorizontalGrid();
  const before = serializeProgram(p);
  for (const strokeDashMap of [undefined, null, {}, [{ value: 0, strokeDash: [1] }],
    [{ value: NaN, strokeDash: [] }], [{ value: 0, strokeDash: [] }, { value: -0, strokeDash: [] }],
    [{ value: 1, strokeDash: [], extra: 1 }], [{ value: 1, strokeDash: [Infinity, 1] }]]) {
    assert.throws(() => p.editYAxisTicks({ strokeDashMap }));
    assert.throws(() => p.editHorizontalGrid({ strokeDashMap }));
  }
  for (const strokeDash of [[1], [-1, 1], [NaN, 1], null, undefined]) {
    assert.throws(() => p.editYAxisTicks({ strokeDash }));
  }
  const envelope = JSON.parse(before), state = decodeValue(envelope.payload);
  state.materializationConfigs.guides.axis.y.ticks.strokeDashMap = "auto";
  envelope.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  assert.equal(serializeProgram(p), before);
});

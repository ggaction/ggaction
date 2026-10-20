import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/ChartProgram.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { deriveLineSeries } from "../../../../src/grammar/lineSeries.js";
import { resolveLineItems } from "../../../../src/materialization/selection/items/path.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { createCanvas } from "@napi-rs/canvas";
import { render } from "../../../../src/index.js";
import { exportAccessibleData } from "../../../../src/accessibility.js";

const scale = Object.freeze({domain: ["Regression", "Reference"], range: ["firebrick", "black"], unknown: "transparent"});
const missing = [{x: 0, y: 0}, {x: 1, y: 1}];
const paths = p => p.graphicSpec.objects.paths.items.map(item => item.properties);
function base(values = missing, factory = chart) {
  return factory().createCanvas({width: 440, height: 220, margin: {left: 20, right: 160, top: 10, bottom: 20}})
    .createData({id: "raw", values});
}
function line(values = missing, factory = chart) {
  return base(values, factory).createLinePlot({id: "paths", x: "x", y: "y", guides: false});
}
function colored(values = missing, factory = chart) {
  return line(values, factory).encodeColor({field: "kind", scale});
}
function atomic(program, operation, expected) {
  const before = serializeProgram(program);
  assert.throws(() => operation(program), expected);
  assert.equal(serializeProgram(program), before);
}

test("missing line colors preserve raw vertices and an explicit two-sample legend in Full and Basic", () => {
  for (const factory of [chart, basicChart]) {
    const p = colored(missing, factory).createLegend({channels: ["color"], title: "Line"});
    assert.deepEqual(p.semanticSpec.datasets[0].values, missing);
    assert.ok(p.semanticSpec.datasets[0].values.every(row => !Object.hasOwn(row, "kind")));
    assert.deepEqual(paths(p).map(path => path.stroke), ["transparent"]);
    assert.deepEqual(paths(p)[0].commands.map(c => c.op), ["M", "L"]);
    assert.deepEqual(p.resolvedScales.color.domain, scale.domain);
    assert.deepEqual(p.resolvedScales.color.range, scale.range);
    assert.deepEqual(Object.values(p.guideConfigs.legend)[0].domain, scale.domain);
    const svg = renderToSVG(p);
    assert.match(svg, /firebrick/);
    assert.match(svg, /Regression/);
    assert.match(svg, /Reference/);
  }
});

test("absent, null, and distinct unknown categories remain separate first-appearance series", () => {
  const categories = [undefined, null, "outside-a", "outside-b", "Reference", false, 0, "0"];
  const values = categories.flatMap((kind, i) => [0, 1].map(x => ({x, y: i + x, ...(kind === undefined ? {} : {kind})})));
  const p = colored(values);
  const derived = deriveLineSeries(values, p.semanticSpec.layers[0], {scales: p.semanticSpec.scales});
  assert.equal(derived.series.length, 8);
  assert.deepEqual(derived.series.map(s => s.key.kind), categories);
  assert.deepEqual(paths(p).map(path => path.stroke), ["transparent", "transparent", "transparent", "transparent", "black", "transparent", "transparent", "transparent"]);
  assert.ok(paths(p).every(path => path.commands.length === 2));
  const items = resolveLineItems(p, p.semanticSpec.layers[0], p.semanticSpec.datasets[0]);
  assert.equal(items.length, 8);
  assert.ok(items.every(item => item.members.length === 2));
  assert.deepEqual(p.semanticSpec.datasets[0].values, values);
});

test("facade, bulk, reused scale, and color-before-position produce identical paths", () => {
  const expected = colored();
  const facade = base().createLinePlot({id: "paths", x: "x", y: "y", color: {field: "kind", scale}, guides: false});
  const bulk = line().encodeChannels({target: "paths", channels: {color: {field: "kind", scale}}});
  const reused = line().createScale({id: "fixed", type: "ordinal", ...scale}).encodeColor({field: "kind", scale: {id: "fixed"}});
  const early = base().createLineMark({id: "paths"}).encodeColor({field: "kind", scale})
    .encodeY({field: "y"}).encodeX({field: "x"});
  for (const p of [facade, bulk, reused, early]) assert.deepEqual(paths(p), paths(expected));
});

test("strict defaults, malformed categories, missing positions and unsupported grains reject atomically", () => {
  atomic(line(), p => p.encodeColor({field: "kind"}), /nominal/);
  for (const value of [{}, [], NaN, Infinity, -Infinity]) {
    atomic(line(missing.map(row => ({...row, kind: value}))), p => p.encodeColor({field: "kind", scale}), /nominal/);
  }
  for (const patch of [{domain: "auto"}, {domain: []}, {type: "sequential"}]) {
    atomic(line(), p => p.encodeColor({field: "kind", scale: {...scale, ...patch}}), /domain|ordinal|scale|requires/i);
  }
  const incomplete = base([{x: 0, kind: null}, {x: 1, y: 1, kind: null}]).createLineMark({id: "paths"})
    .encodeColor({field: "kind", scale}).encodeX({field: "x"});
  atomic(incomplete, p => p.encodeY({field: "y"}), /finite/);
  const aggregate = base([{x: "a", y: 1}, {x: "b", y: 2}])
    .createLinePlot({id: "paths", x: {field: "x", fieldType: "nominal"}, y: {field: "y", aggregate: "sum"}, guides: false});
  atomic(aggregate, p => p.encodeColor({field: "kind", scale}), /Cartesian line/);
  atomic(base().createAreaMark({id: "area"}), p => p.encodeColor({field: "kind", scale}), /Cartesian line/);
  const polar = base().createPolarLinePlot({id: "paths", theta: "x", radius: "y", guides: false});
  atomic(polar, p => p.encodeColor({field: "kind", scale}), /Cartesian line/);
  const parallel = base().createParallelCoordinates({id: "paths", dimensions: [{field: "x"}, {field: "y"}]});
  atomic(parallel, p => p.encodeColor({field: "kind", scale}), /Cartesian line/);
  atomic(line(), p => p.encodeStroke({field: "x", fieldType: "quantitative", scale: {unknown: "transparent"}}), /row-owned point/);
});

test("explicit groups stay strict and require one raw color value within each series", () => {
  const values = missing.map(row => ({...row, group: "one"}));
  const p = line(values).encodeGroup({field: "group"}).encodeColor({field: "kind", scale});
  assert.equal(paths(p).length, 1);
  assert.deepEqual(paths(p).map(path => path.stroke), ["transparent"]);
  atomic(p, q => q.encodeGroup({field: "kind"}), /nominal/);
  const mixed = line([{x: 0, y: 0, group: "one"}, {x: 1, y: 1, group: "one", kind: null}]).encodeGroup({field: "group"});
  atomic(mixed, q => q.encodeColor({field: "kind", scale}), /one value/);
});

test("scale, appearance, canvas and grouping edits retain fallback ownership without changing raw rows", () => {
  const values = missing.map(row => ({...row, group: "one", width: 2, alpha: 0.6}));
  const p = colored(values).createLegend({channels: ["color"], title: "Line"});
  const recolored = p.editColorScale({unknown: "orange"});
  assert.deepEqual(paths(recolored).map(path => path.stroke), ["orange"]);
  assert.deepEqual(recolored.resolvedScales.color.range, scale.range);
  const changed = p.encodeGroup({field: "group"}).encodeStrokeWidth({field: "width"})
    .encodeOpacity({field: "alpha"}).encodeStrokeDash({value: "dashed"}).editCanvas({width: 460});
  assert.equal(paths(changed)[0].stroke, "transparent");
  assert.deepEqual(changed.semanticSpec.datasets[0].values, values);
  atomic(p, q => q.editColorScale({domain: "auto"}), /explicit ordinal domain/);
  atomic(p, q => q.editScale({id: "color", unknown: undefined}), /nominal/);
  const valid = colored(missing.map(row => ({...row, kind: "Reference"}))).editScale({id: "color", unknown: undefined});
  assert.deepEqual(paths(valid).map(path => path.stroke), ["black"]);
});

test("shared scales preflight unsupported consumers and retain point fallback behavior", () => {
  const p = colored().createPointMark({id: "points"}).encodeX({field: "x"}).encodeY({field: "y"})
    .encodeColor({field: "kind", scale: {id: "color"}});
  const changed = p.editScale({id: "color", unknown: "orange"});
  assert.equal(paths(changed)[0].stroke, "orange");
  assert.ok(changed.graphicSpec.objects.points.items.every(item => item.properties.fill === "orange"));
  atomic(p.createAreaMark({id: "area"}), q => q.encodeColor({field: "kind", scale: {id: "color"}}), /Cartesian line/);
  const point = base([{x: 0, y: 1, kind: {}}, {x: 1, y: 2, kind: null}])
    .createScatterPlot({id: "points", x: "x", y: "y", guides: false})
    .encodeColor({field: "kind", scale});
  assert.ok(point.graphicSpec.objects.points.items.every(item => item.properties.fill === "transparent"));
});

test("revision, derived replay, facets and editable restoration preserve missing raw keys", () => {
  const p = base().createComputedData({id: "derived", as: "height", expression: {op: "multiply", left: {field: "y"}, right: {constant: 2}}})
    .createLinePlot({id: "paths", x: "x", y: "height", guides: false}).encodeColor({field: "kind", scale});
  const revised = p.reviseData({source: "raw", id: "updated", values: [{x: 0, y: 2}, {x: 2, y: 4}]});
  assert.equal(paths(revised)[0].stroke, "transparent");
  assert.ok(revised.semanticSpec.datasets.every(data => data.values.every(row => !Object.hasOwn(row, "kind"))));
  const restored = deserializeProgram(serializeProgram(revised));
  assert.deepEqual(restored.graphicSpec, revised.graphicSpec);
  assert.deepEqual(paths(restored.editColorScale({unknown: "orange"})).map(path => path.stroke), ["orange"]);
  const edited = revised.editComputedData({target: "derived", expression: {op: "multiply", left: {field: "y"}, right: {constant: 3}}, dependents: "recompute"});
  assert.deepEqual(paths(edited).map(path => path.stroke), ["transparent"]);
  assert.doesNotThrow(() => exportAccessibleData(edited));
  atomic(revised, q => q.reviseData({source: "updated", id: "invalid", values: [{x: 0, y: 0, kind: {}}, {x: 1, y: 1}]}), /nominal/);
  const grouped = colored(["a", "b"].flatMap(group => missing.map(row => ({...row, group}))))
    .editCanvas({margin: {left: 20, right: 160, top: 40, bottom: 20}}).facet({field: "group"});
  assert.equal(Object.keys(grouped.children).length, 2);
  for (const child of Object.values(grouped.children)) assert.equal(paths(child)[0].stroke, "transparent");
});

test("transparent missing-color paths leave exact primitive pixels for the observed reference line", () => {
  const values = [undefined, null, "Reference"].flatMap(kind => missing.map(row => ({...row, ...(kind === undefined ? {} : {kind})})));
  const p = colored(values);
  const actual = createCanvas(440, 220).getContext("2d");
  render(p, actual);
  const expected = createCanvas(440, 220).getContext("2d");
  expected.fillStyle = "white";
  expected.fillRect(0, 0, 440, 220);
  expected.strokeStyle = "black";
  expected.lineWidth = 2;
  expected.beginPath();
  expected.moveTo(20, 200);
  expected.lineTo(280, 10);
  expected.stroke();
  assert.deepEqual(actual.getImageData(0, 0, 440, 220).data, expected.getImageData(0, 0, 440, 220).data);
  assert.deepEqual(paths(p).map(path => path.commands), Array(3).fill([{op: "M", x: 20, y: 200}, {op: "L", x: 280, y: 10}]));
});

test("selection and highlights retain the inferred series and refresh from the unhighlighted colors", () => {
  const values = [undefined, null, "Reference"].flatMap(kind => missing.map(row => ({...row, ...(kind === undefined ? {} : {kind})})));
  const p = colored(values).createLegend({channels: ["color"], title: "Line"});
  const highlighted = p.highlightMarks({select: {field: "kind", op: "eq", value: "Reference"}, stroke: "purple"});
  assert.deepEqual(paths(highlighted).map(path => path.stroke), ["transparent", "transparent", "purple"]);
  const changed = highlighted.editColorScale({unknown: "orange"});
  assert.deepEqual(paths(changed).map(path => path.stroke), ["orange", "orange", "purple"]);
  const filtered = p.filterMarks({field: "kind", op: "eq", value: "Reference"});
  assert.deepEqual(paths(filtered).map(path => path.stroke), ["black"]);
  assert.deepEqual(p.semanticSpec.datasets[0].values, values);
});

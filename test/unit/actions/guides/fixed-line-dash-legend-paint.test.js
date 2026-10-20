import assert from "node:assert/strict";
import test from "node:test";
import {chart} from "../../../../src/index.js";
import {chart as basicChart} from "../../../../src/basic.js";
const rows = Object.freeze([
  Object.freeze({x: 0, y: 1, g: "A"}), Object.freeze({x: 1, y: 1, g: "A"}),
  Object.freeze({x: 0, y: 2, g: "B"}), Object.freeze({x: 1, y: 2, g: "B"})
]);
function base(create = chart) {
  return create().createCanvas({width: 600, height: 360, margin: 90})
    .createData({values: rows}).createLinePlot({x: "x", y: "y", guides: false})
    .encodeGroup({field: "g"}).encodeStrokeDash({field: "g", scale: {range: [[1, 0], [4, 2]]}});
}
const recipe = Object.freeze({layers: Object.freeze([
  Object.freeze({type: "line", length: 10, lineWidth: 1, opacity: 1})
])});
const samples = p => p.graphicSpec.objects.seriesLegendSymbols.items.map(x => x.properties);
const strokes = p => samples(p).map(x => x.stroke);
for (const [name, create] of [["Full", chart], ["Basic", basicChart]]) {
  test(`${name} fixed line stroke colors automatic and explicit dash samples`, () => {
    const before = base(create).editLineMark({stroke: "orange", opacity: 0.6});
    for (const symbol of [undefined, recipe]) {
      const p = before.createLegend(symbol === undefined ? {} : {symbol});
      assert.deepEqual(strokes(p), ["orange", "orange"]);
      assert.deepEqual(samples(p).map(x => x.strokeDash), [[1, 0], [4, 2]]);
      if (symbol) assert(samples(p).every(x => x.opacity === 1));
      assert.equal(before.guideConfigs.legend, undefined);
      assert.deepEqual(rows[0], {x: 0, y: 1, g: "A"});
    }
  });
}
test("fixed encodeStroke values use the same stored paint and preserve explicit sample opacity", () => {
  const p = base().encodeStroke({value: "purple"}).editLineMark({opacity: 0.4})
    .createLegend({symbol: recipe});
  assert.equal(p.markConfigs.linePlot.stroke, "purple");
  assert.deepEqual(strokes(p), ["purple", "purple"]);
  assert(samples(p).every(x => x.opacity === 1));
});
test("later fixed line edits rematerialize samples without mutating earlier programs", () => {
  const p = base().editLineMark({stroke: "orange"}).createLegend({symbol: recipe});
  const frozen = JSON.stringify(p);
  const q = p.editLineMark({stroke: "purple"});
  assert.deepEqual(strokes(q), ["purple", "purple"]);
  assert.deepEqual(strokes(p), ["orange", "orange"]);
  assert.equal(JSON.stringify(p), frozen);
});
test("explicit block stroke remains above fixed line paint on later edits", () => {
  const p = base().editLineMark({stroke: "orange"}).createLegend({symbol: recipe})
    .editLegendBlock({target: "linePlot", channel: "strokeDash", symbol: {stroke: "black"}});
  assert.deepEqual(strokes(p.editLineMark({stroke: "purple"})), ["black", "black"]);
  assert.deepEqual(strokes(p), ["black", "black"]);
});
test("mapped categorical color keeps scale paint precedence", () => {
  const p = base().encodeColor({field: "g", scale: {range: ["red", "green"]}})
    .createLegend({symbol: recipe});
  assert.deepEqual(strokes(p), ["red", "green"]);
});
test("unassigned line paint retains the existing default sample color", () => {
  assert.deepEqual(strokes(base().createLegend({symbol: recipe})), ["#4c78a8", "#4c78a8"]);
});
test("Canvas, data and dash-scale replay retain fixed paint and mapped dash values", () => {
  const p = base().editLineMark({stroke: "orange"}).createLegend({symbol: recipe});
  const q = p.reviseData({source: "data", id: "revised", values: rows.map(r => ({...r, y: r.y + 1}))})
    .editCanvas({width: 650}).editStrokeDashScale({range: [[2, 2], [8, 4]]});
  assert.deepEqual(strokes(q), ["orange", "orange"]);
  assert.deepEqual(samples(q).map(x => x.strokeDash), [[2, 2], [8, 4]]);
  assert.deepEqual(samples(p).map(x => x.strokeDash), [[1, 0], [4, 2]]);
});

test("mapped stroke keeps scale paint precedence over the fallback", () => {
  const p = base().encodeStroke({field: "g", scale: {range: ["red", "green"]}})
    .createLegend({symbol: recipe});
  assert.deepEqual(strokes(p), ["red", "green"]);
});

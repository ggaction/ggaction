import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { normalizeOHLCPlot } from "../../../src/grammar/ohlcPlot.js";
import { resolveOHLCPlot, ohlcScaleValues } from "../../../src/materialization/ohlc/plot.js";
function fixture(patch = {}, values = [
  { id: "up", day: "A", l: 1, h: 9, o: 3, c: 7 },
  { id: "down", day: "B", l: 2, h: 8, o: 6, c: 4 },
  { id: "flat", day: "C", l: 4, h: 6, o: 5, c: 5 }
]) {
  const program = chart().createCanvas({ width: 340, height: 240, margin: 20 }).createData({ id: "d", values, keyField: "id" }).createCoordinate({ id: "main", type: "cartesian" });
  const { binding, config } = normalizeOHLCPlot({ open: "o", close: "c", width: { pixels: 20 }, ...patch });
  const layer = { id: "prices", mark: { type: "ohlc" }, data: "d", coordinate: "main", ohlc: binding, encoding: {
    x: { field: "day", fieldType: "nominal", scale: "x" }, y: { field: "l", fieldType: "quantitative", scale: "y" }, y2: { field: "h", fieldType: "quantitative", scale: "y" }
  } };
  const scales = { x: { type: "band", domain: ["A", "B", "C"], range: [20, 320], start: 20, bandwidth: 100, step: 100 }, y: { type: "linear", domain: [0, 10], range: [220, 20] } };
  return { program, layer, config, scales };
}
test("OHLC literal primitive coordinates preserve price roles and one typed row identity", () => {
  const f = fixture(); const result = resolveOHLCPlot(f.program, f.layer, f.config, f.scales);
  assert.deepEqual(result.graphics.map(item => [item.type, ...Object.entries(item.properties).filter(([key]) => ["x", "y", "x1", "x2", "y1", "y2", "width", "height"].includes(key)).map(([, value]) => value)]), [
    ["line", 70, 70, 200, 40], ["rect", 60, 80, 20, 80], ["line", 170, 170, 180, 60], ["rect", 160, 100, 20, 40], ["line", 270, 270, 140, 100], ["line", 260, 280, 120, 120]
  ]);
  assert.equal(result.items.length, 3); assert.equal(result.graphics[0].identity.key, result.graphics[1].identity.key);
  assert.notEqual(result.graphics[0].identity.key, result.graphics[2].identity.key);
  assert.deepEqual(result.items.map(item => item.channels.trend), ["up", "down", "flat"]);
  assert.equal(result.graphics[1].properties.fill, "#16a34a"); assert.equal(result.graphics[3].properties.fill, "#dc2626");
});
test("OHLC flat-body visibility and labels do not change the source price range", () => {
  const f = fixture({ doji: "none", labels: { content: "close", fontSize: 10 } });
  const result = resolveOHLCPlot(f.program, f.layer, f.config, f.scales);
  assert.equal(result.graphics.filter(item => item.identity.role === "body").length, 2);
  assert.deepEqual(result.graphics.filter(item => item.type === "text").map(item => [item.properties.text, item.properties.y]), [["7", 34], ["4", 54], ["5", 94]]);
  assert.deepEqual(result.items[2].graphicRoles, ["stem", "label"]);
});
test("OHLC omitted price rows also leave the x domain and retain original row identities", () => {
  const f = fixture({ invalid: "omit-row" }, [{ id: "bad", day: null, l: 9, h: 1, o: 3, c: 4 }, { id: "good", day: "B", l: 2, h: 8, o: 4, c: 6 }]);
  const result = resolveOHLCPlot(f.program, f.layer, f.config, f.scales);
  assert.equal(result.items.length, 1); assert.deepEqual(result.omittedSourceIndices, [0]);
  assert.deepEqual(ohlcScaleValues(result.dataset, f.layer, f.layer.encoding.x), ["B"]);
  assert.deepEqual(result.items[0].memberKeys, [result.dataset.rowKeys[1]]);
});

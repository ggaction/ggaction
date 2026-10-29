import assert from "node:assert/strict";
import test from "node:test";
import { hconcat } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { createGeographicMarks } from "../../examples/geographic-marks/program.js";
import { createOHLC } from "../../examples/ohlc/program.js";
import { createPyramid } from "../../examples/pyramid/program.js";

test("geographic viewport and compound chart edits preserve scoped sibling identities through offline restore", () => {
  const prices = createOHLC().selectMarks({ id: "picked", target: "ohlc", field: "id", op: "eq", value: "a" })
    .highlightMarks({ selection: "picked", fill: "gold", dimOthers: false });
  const program = hconcat({ programs: [{ id: "map", program: createGeographicMarks() },
    { id: "prices", program: prices }, { id: "stages", program: createPyramid() }] });
  const before = serializeProgram(program), keys = getMarkItems(prices, { target: "ohlc" }).map(item => item.key);
  const session = createInteractionSession({ program, bindings: [] });
  try {
    session.dispatch({ type: "setViewport", target: { childPath: ["map"], id: "map" }, payload: { scalePx: 1.1, translatePx: [5, 7] } });
    const moved = session.getState().program;
    assert.equal(moved.children.prices, program.children.prices);
    assert.equal(moved.children.stages, program.children.stages);
    const revised = moved.editOHLCPlot({ target: { childPath: ["prices"], id: "ohlc" }, yScale: { domain: [-1, 12] } });
    assert.equal(revised.children.map, moved.children.map);
    assert.equal(revised.children.stages, moved.children.stages);
    const next = revised.editPyramidPlot({ target: { childPath: ["stages"], id: "pyramid" }, orientation: "left" });
    assert.equal(next.children.prices, revised.children.prices);
    assert.equal(next.children.map, revised.children.map);
    for (const value of [next, deserializeProgram(serializeProgram(next))]) {
      assert.deepEqual(getMarkItems(value.children.prices, { target: "ohlc" }).map(item => item.key), keys);
      const body = value.children.prices.graphicSpec.objects.ohlc.items.find(item => item.identity?.key === keys[0] && item.identity.role === "body");
      assert.equal(body.properties.fill, "gold");
      assert.equal(value.children.stages.semanticSpec.layers[0].pyramid.options.orientation, "left");
      assert.deepEqual(value.children.map.semanticSpec.resources.find(resource => resource.kind === "projection" && resource.id === "map").options.translatePx, [5, 7]);
    }
    assert.equal(serializeProgram(program), before);
    assert.equal(session.getState().revision, 1);
  } finally { session.destroy(); }
});

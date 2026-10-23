import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

test("endpoint role edits refresh old categorical guide samples and preserve their appearance", () => {
  const rows = [
    { a: "A", b: "First", v: 3, w: 5 },
    { a: "A", b: "Second", v: 4, w: 6 },
    { a: "B", b: "First", v: 5, w: 7 },
    { a: "B", b: "Second", v: 6, w: 8 }
  ];
  for (const method of ["createDotPlot", "createLollipopPlot", "createDumbbellPlot"]) {
    const p = chart().createCanvas({ width: 640, height: 400, margin: 90 })
      .createData({ values: rows })[method]({
        id: "plot", category: "a", summary: "mean", orientation: "vertical",
        ...(method === "createDumbbellPlot" ? { start: "v", end: "w" } : { value: "v" }),
        guides: { axes: { x: { ticksAndLabels: {
          values: ["A", "B"], labels: { rotation: { value: 45, unit: "degrees" }, fontSize: 12 }
        } } } }
      });
    const before = JSON.stringify(p);
    const edited = p.editEndpointPlot({ target: "plot", category: "b" });
    assert.match(renderToSVG(edited), /First/);
    assert.match(renderToSVG(edited), /Second/);
    assert.equal(edited.guideConfigs.axis.x.labels.fontSize, 12);
    assert.equal(edited.guideConfigs.axis.x.labels.rotation, Math.PI / 4);
    assert.equal(edited.markConfigs.plot.endpointPlot.options.guides.axes.x.ticksAndLabels.values, undefined);
    assert.equal(edited.trace.children.at(-1).op, "editEndpointPlot");
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(edited))), renderToSVG(edited));
    assert.equal(JSON.stringify(p), before);
    const reoriented = edited.editEndpointPlot({ target: "plot", orientation: "horizontal" });
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(reoriented))), renderToSVG(reoriented));
    assert.deepEqual(Object.keys(reoriented.guideConfigs.axis).sort(), ["x", "y"]);
  }
});

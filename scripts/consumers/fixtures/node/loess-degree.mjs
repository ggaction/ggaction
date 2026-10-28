import assert from "node:assert/strict";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { createTransitionScene } from "ggaction/scene";
import { createCanvas } from "@napi-rs/canvas";

export const cases = [{ id: "regression/quadratic-loess", async run() {
  const values = Array.from({ length: 9 }, (_, x) => ({ x, y: x * x }));
  const program = chart().createCanvas({ width: 320, height: 240, margin: 40 }).createData({ values })
    .createRegressionPlot({ x: "x", y: "y", method: "loess", degree: 2, span: 1, robustIterations: 2, guides: false });
  const fitted = program.semanticSpec.datasets.find(d => d.transform?.[0]?.type === "regression");
  assert.equal(fitted.transform[0].degree, 2);
  fitted.values.forEach(row => assert.ok(Math.abs(row.y - row.x * row.x) < 1e-9));
  const restored = deserializeProgram(serializeProgram(program)), reset = restored.editRegression({ degree: 1 });
  assert.equal(reset.semanticSpec.datasets.at(-1).transform[0].degree, undefined);
  assert.notEqual(renderToSVG(reset), renderToSVG(program));
  assert.deepEqual(restored.graphicSpec, program.graphicSpec);
  render(program, createCanvas(320, 240).getContext("2d"));
  assert.ok((await renderToPNGBuffer(program)).buffer.length > 100);
  assert.ok((await renderToPDFBuffer(program)).buffer.length > 100);
  assert.ok(createTransitionScene(program).nodes.some(node => node.type === "path"));
  const basic = basicChart().createData({ id: "raw", values });
  assert.equal(basic.createRegressionPlot, undefined);
  assert.throws(() => basic.createDerivedData({ id: "fit", source: "raw", transform: fitted.transform }), /Unsupported dataset transform/);
} }];

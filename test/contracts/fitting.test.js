import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chart, hconcat } from "../../src/index.js";
import { chart as basicChart } from "../../src/basic.js";

const root = fileURLToPath(new URL("../..", import.meta.url));

function read(relative) {
  return readFileSync(path.join(root, relative), "utf8");
}

test("publishes fitting only on Full unit programs", () => {
  const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
  const entries = index.actions.filter(action => action.name === "fitCanvas");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].contract.file, "agent_docs/contract/current/CORE.md");
  assert.equal(typeof chart().fitCanvas, "function");
  assert.equal(basicChart().fitCanvas, undefined);
  const composition = hconcat({
    programs: [chart().createCanvas(), chart().createCanvas()]
  });
  assert.equal(typeof composition.fitCanvas, "function");
  assert.throws(
    () => composition.fitCanvas(),
    /not available on a composition ChartProgram/u
  );

  const program = read("types/program.d.ts");
  const rootTypes = read("types/index.d.ts");
  const basic = read("types/basic.d.ts");
  assert.match(program, /^export interface FitCanvasOptions \{$/m);
  assert.match(program, /^  fitCanvas\(options\?: FitCanvasOptions\): ChartProgram;$/m);
  assert.match(rootTypes, /^  FitCanvasOptions,$/m);
  assert.doesNotMatch(basic, /\bFitCanvasOptions\b/u);
  assert.doesNotMatch(basic, /\| "fitCanvas"/u);
});

test("keeps fitting inside one authoring trace and preserves semantic state", () => {
  const source = chart()
    .createCanvas({ width: 640, height: 400, margin: 100 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createAxes();
  const semantic = JSON.stringify(source.semanticSpec);
  const domains = Object.fromEntries(Object.entries(source.resolvedScales)
    .map(([id, scale]) => [id, scale.domain]));
  const order = JSON.stringify(source.graphicSpec.order);
  const fitted = source.fitCanvas();
  const node = fitted.trace.children.at(-1);

  assert.equal(node.op, "fitCanvas");
  assert.deepEqual(node.children.map(child => child.op), ["editCanvas"]);
  assert.equal(JSON.stringify(fitted.semanticSpec), semantic);
  assert.deepEqual(Object.fromEntries(Object.entries(fitted.resolvedScales)
    .map(([id, scale]) => [id, scale.domain])), domains);
  assert.equal(JSON.stringify(fitted.graphicSpec.order), order);
});

test("publishes Cartesian label layout without leaking it to Parallel labels", () => {
  const program = read("types/program.d.ts");
  assert.match(program, /^export interface AxisLabelLayoutOptions \{$/m);
  assert.match(program, /extends AxisLabelStyleOptions, AxisLabelLayoutOptions \{/u);
  assert.match(program, /labels\?: AxisLabelStyleOptions & AxisLabelLayoutOptions;/u);
  assert.match(program, /ParallelAxisLabelsOptions = AxisLabelStyleOptions & ParallelAxisTickSelection;/u);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { chart as basicChart } from "../../src/basic.js";
import { chart as editableChart } from "../../src/index.js";

const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

function quickStartProgram() {
  const observations = [
    { displacement: 97, acceleration: 14.5, origin: "Japan" },
    { displacement: 140, acceleration: 15.5, origin: "USA" },
    { displacement: 86, acceleration: 16.4, origin: "Japan" }
  ];

  return basicChart()
    .createCanvas({
      width: 640,
      height: 400,
      margin: { top: 30, right: 130, bottom: 60, left: 70 }
    })
    .createData({ values: observations })
    .createScatterPlot({
      x: "displacement",
      y: "acceleration",
      color: "origin",
      shape: "origin"
    });
}

function editableProgram() {
  const observations = [
    { displacement: 97, acceleration: 14.5, origin: "Japan" },
    { displacement: 140, acceleration: 15.5, origin: "USA" },
    { displacement: 86, acceleration: 16.4, origin: "Japan" }
  ];

  return editableChart()
    .createCanvas({ width: 640, height: 400 })
    .createData({ values: observations })
    .createScatterPlot({
      x: "displacement",
      y: "acceleration",
      color: "origin"
    });
}

test("keeps the README revision branches immutable and independently traced", () => {
  const quickStart = quickStartProgram();
  const checkpoint = editableProgram();
  const outlined = checkpoint.editPointMark({
    stroke: "#0f172a",
    strokeWidth: 2
  });
  const muted = checkpoint.editPointMark({ opacity: 0.35 });

  assert.equal(
    quickStart.semanticSpec.layers[0].encoding.shape.field,
    "origin"
  );
  assert.equal(checkpoint.semanticSpec.layers[0].encoding.shape, undefined);
  assert.notEqual(checkpoint, outlined);
  assert.notEqual(checkpoint, muted);
  assert.notEqual(outlined, muted);
  assert.equal(Object.isFrozen(checkpoint), true);
  assert.equal(Object.isFrozen(outlined), true);
  assert.equal(Object.isFrozen(muted), true);
  assert.deepEqual(
    [checkpoint, outlined, muted].map(revision =>
      revision.trace.children.at(-1).op
    ),
    ["createScatterPlot", "editPointMark", "editPointMark"]
  );
  assert.deepEqual(
    [checkpoint, outlined, muted].map(revision => revision.trace.children.length),
    [3, 4, 4]
  );

  assert.deepEqual(
    checkpoint.graphicSpec.objects.scatterPlot.items.map(item => item.type ?? "circle"),
    ["circle", "circle", "circle"]
  );
  assert.deepEqual(
    outlined.graphicSpec.objects.scatterPlot.items.map(
      item => item.properties.stroke
    ),
    ["#0f172a", "#0f172a", "#0f172a"]
  );
  assert.equal(
    checkpoint.graphicSpec.objects.scatterPlot.items.every(
      item => item.properties.opacity === undefined
    ),
    true
  );
  assert.deepEqual(
    muted.graphicSpec.objects.scatterPlot.items.map(item => item.properties.opacity),
    [0.35, 0.35, 0.35]
  );
});

test("keeps the executable revision example immediately after Quick Start", () => {
  assert.match(readme, /^### Branch revisions without mutation$/m);
  assert.match(
    readme,
    /import \{ chart as editableChart \} from "ggaction";/
  );
  assert.match(
    readme,
    /const outlined = checkpoint\.editPointMark\(\{[\s\S]*strokeWidth: 2[\s\S]*\}\);/
  );
  assert.match(
    readme,
    /checkpoint\.trace\.children\.at\(-1\)\.op[\s\S]*"createScatterPlot"/
  );
  assert.match(
    readme,
    /outlined\.trace\.children\.at\(-1\)\.op[\s\S]*"editPointMark"/
  );
  assert.match(
    readme,
    /immutable values, not an\nautomatic undo stack; the application chooses/
  );
  assert.equal(
    readme.indexOf("### Branch revisions without mutation") >
      readme.indexOf("render(program, context);"),
    true
  );
  assert.equal(
    readme.indexOf("### Branch revisions without mutation") <
      readme.indexOf("Use `createLinePlot`"),
    true
  );
});

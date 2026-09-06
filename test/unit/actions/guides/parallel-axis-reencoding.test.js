import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { assertAtomicFailures } from "../../../support/program-state.js";

function base(guides = { legend: false }) {
  return chart().createCanvas({ width: 600, height: 400, margin: 70 })
    .createData({ values: [{ a: 0, b: 10, c: 100, d: 1000 }, { a: 2, b: 20, c: 200, d: 2000 }] })
    .createParallelCoordinates({ id: "lines", dimensions: ["a", "b", "c"], guides });
}

function titles(p) {
  return p.graphicSpec.objects.parallelAxisTitles.items.map(item => item.properties.text);
}

test("reencoding Parallel dimensions updates axis titles, positions, and scale consumers together", () => {
  const p = base();
  const before = JSON.stringify(p);
  const q = p.encodeParallelCoordinates({ target: "lines", dimensions: [
    { field: "c", title: "C" },
    { field: "b", title: "B" },
    { field: "a", title: "A" }
  ] });
  assert.deepEqual(titles(q), ["C", "B", "A"]);
  assert.deepEqual([0, 1, 2].map(index => q.resolvedScales[`lines-parallel-${index}`].domain),
    [[100, 200], [10, 20], [0, 2]]);
  assert.deepEqual(q.graphicSpec.objects.parallelAxisTitles.items.map(item => item.properties.x), [70, 300, 530]);
  assert.equal(q.graphicSpec.objects.parallelAxisLabels.items[0].properties.text, "100");
  assert.equal(q.graphicSpec.objects.parallelAxisLabels.items[0].properties.y, 330);
  assert.deepEqual(q.graphicSpec.objects.lines.items[0].properties.commands, [
    { op: "M", x: 70, y: 330 }, { op: "L", x: 300, y: 330 }, { op: "L", x: 530, y: 330 }
  ]);
  const ops = q.trace.children.at(-1).children.map(child => child.op);
  assert.equal(ops.filter(op => op === "rematerializeParallelAxes").length, 1);
  assert.ok(ops.indexOf("rematerializeParallelAxes") > ops.indexOf("rematerializeLineMark"));
  assert.equal(JSON.stringify(p), before);
});

test("adding and removing dimensions updates semantic axis scales and removes obsolete items", () => {
  const p = base();
  const expanded = p.encodeParallelCoordinates({ target: "lines", dimensions: ["a", "b", "c", "d"] });
  assert.deepEqual(titles(expanded), ["a", "b", "c", "d"]);
  assert.deepEqual(expanded.semanticSpec.guides.axis.parallel.scales,
    expanded.semanticSpec.layers[0].encoding.parallel.dimensions.map(d => d.scale));
  const q = expanded.encodeParallelCoordinates({ target: "lines", dimensions: ["d", "a"] });
  assert.deepEqual(titles(q), ["d", "a"]);
  assert.equal(q.graphicSpec.objects.parallelAxisLines.items.length, 2);
  assert.deepEqual(q.semanticSpec.guides.axis.parallel.scales, ["lines-parallel-0", "lines-parallel-1"]);
  assert.deepEqual(q.guideConfigs.axis.parallel.axes.scales, q.semanticSpec.guides.axis.parallel.scales);
  const replay = q.editCanvas({ width: 700 }).editScale({ id: "lines-parallel-1", domain: [0, 4] });
  assert.deepEqual(titles(replay), ["d", "a"]);
  assert.deepEqual(replay.graphicSpec.objects.parallelAxisTitles.items.map(item => item.properties.x), [70, 630]);
});

test("reencoding does not create omitted axes or replace another Parallel owner's guides", () => {
  const absent = base(false).encodeParallelCoordinates({ target: "lines", dimensions: ["c", "a"] });
  assert.equal(absent.guideConfigs.axis?.parallel, undefined);
  assert.equal(absent.graphicSpec.objects.parallelAxisLines, undefined);
  const p = base().createParallelCoordinates({ id: "other", dimensions: ["a", "c"], guides: false });
  const q = p.encodeParallelCoordinates({ target: "other", dimensions: ["c", "a"] });
  assert.equal(q.semanticSpec.guides.axis.parallel.target, "lines");
  assert.deepEqual(titles(q), ["a", "b", "c"]);
  for (const suffix of ["Lines", "Ticks", "Labels", "Titles"]) {
    assert.deepEqual(q.graphicSpec.objects[`parallelAxis${suffix}`], p.graphicSpec.objects[`parallelAxis${suffix}`]);
  }
  assertAtomicFailures(p, [{ operation: () => p.encodeParallelCoordinates({ target: "lines", dimensions: ["a", "a"] }) }]);
});

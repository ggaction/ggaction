import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createGettingStartedChart
} from "../../examples/getting-started/program.js";

function read(relative) {
  return readFileSync(new URL(`../../${relative}`, import.meta.url), "utf8");
}

test("keeps the first chart identifiable without color alone", () => {
  const program = createGettingStartedChart();
  const facade = program.trace.children.at(-1);
  const guides = facade.children.at(-1);
  const legend = program.semanticSpec.guides.legend.series;

  assert.deepEqual(facade.children.map(child => child.op), [
    "createPointMark",
    "encodeX",
    "encodeY",
    "encodeColor",
    "encodeShape",
    "createGuides"
  ]);
  assert.deepEqual(guides.children.map(child => child.op), [
    "createAxes",
    "createGrid",
    "createLegend"
  ]);
  assert.deepEqual(legend.channels, ["color", "shape"]);
  assert.deepEqual(legend.scales, ["color", "shape"]);
  assert.deepEqual(
    program.graphicSpec.objects.seriesLegendLabels.items.map(
      item => item.properties.text
    ),
    ["USA", "Japan", "Europe"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.scatterPlot.items.map(
      item => item.type ?? "circle"
    ),
    ["circle", "rect", "path"]
  );
  assert.equal(program.materializationConfigs.canvas.margin.right, 130);

  for (const source of [read("README.md"), read("docs/getting-started.md")]) {
    assert.match(source, /right: 130/);
    assert.match(source, /shape: "origin"/);
  }
  assert.match(read("docs/getting-started.md"), /redundant\s+visual cue/);
  assert.match(read("docs/getting-started.md"), /getting-started-chart\.html/);
  assert.match(
    read("docs/_includes/getting-started-chart.html"),
    /assets\/images\/getting-started\.png/
  );

  const accessibleCanvases = [
    [
      read("README.md"),
      "Scatterplot of displacement versus acceleration by origin"
    ],
    [
      read("docs/getting-started.md"),
      "Scatterplot of horsepower versus mileage by origin"
    ],
    [
      read("examples/getting-started/index.html"),
      "Scatterplot of horsepower versus mileage by origin"
    ]
  ];
  for (const [source, label] of accessibleCanvases) {
    assert.equal(
      source.includes(`<canvas id="chart" aria-label="${label}">`),
      true
    );
    assert.equal(source.includes(`${label}.\n`), true);
    assert.match(source, /<\/canvas>/);
  }
});

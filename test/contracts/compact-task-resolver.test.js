import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { createCanvas } from "@napi-rs/canvas";

import { chart, render } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import {
  searchGgaction,
  taskPacketBytes,
  validateResolverKnowledge
} from "../../knowledge/task-resolver.js";
import { docsFallbackResources } from "../../src/mcp/adapter.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const knowledgeRoot = path.join(root, "knowledge");
const typesRoot = path.join(root, "types");
const tscFile = path.join(root, "node_modules/.bin/tsc");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const authoringPrerequisites = [
  {
    id: "action.createCanvas",
    signature: "createCanvas(options?: CanvasOptions): ChartProgram;",
    call: "program = program.createCanvas({ width: 800, height: 600, margin: { top: 140, right: 220, bottom: 120, left: 260 } })",
    bindings: []
  },
  {
    id: "action.createData",
    signature: "createData(options: { id?: string; values: readonly unknown[] }): ChartProgram;",
    call: "program = program.createData({ values })",
    bindings: ["values"]
  }
];

async function json(name) {
  return JSON.parse(await readFile(path.join(knowledgeRoot, name), "utf8"));
}

function runtimeSignature(source, name) {
  const marker = `export function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, name);
  let depth = 0;
  let closed = -1;
  for (let index = start + marker.length - 1; index < source.length; index += 1) {
    if (source[index] === "(") depth += 1;
    if (source[index] === ")") {
      depth -= 1;
      if (depth === 0) {
        closed = index;
        break;
      }
    }
  }
  assert.notEqual(closed, -1, name);
  const finish = source.indexOf(";", closed);
  assert.notEqual(finish, -1, name);
  return source.slice(start + "export function ".length, finish + 1)
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

async function executeAuthoring(packet, { rows, renderer }) {
  const canvas = createCanvas(320, 220);
  const context = canvas.getContext("2d");
  const source = [
    packet.authoring.initialize,
    ...packet.authoring.prerequisites.map(entry => entry.call),
    ...packet.authoring.steps,
    renderer === "svg" ? "return { program, output }" : "return { program }"
  ].join(";\n");
  return new AsyncFunction(
    "chart",
    "render",
    "renderToSVG",
    "context",
    "values",
    source
  )(chart, render, renderToSVG, context, rows);
}

test("chart packets either materialize their chart or expose the missing decision", async () => {
  const rows = [
    { x: 1, y: 2, value: 0, category: "A", series: "one" },
    { x: 2, y: 3, value: 3, category: "B", series: "one" },
    { x: 3, y: 4, value: 4, category: "C", series: "one" }
  ];
  for (const [query, kind, count, unresolved] of [
    ["pie chart", "arc", 2, []],
    ["density plot", "area", 1, []],
    ["rose chart", "arc", 2, []],
    ["radial bar chart", "arc", 2, []],
    ["radar chart", "line", 1, []],
    ["area chart", "area", 0, ["chart.area.baseline"]],
    ["strip plot", "point", 3, ["chart.strip.placement"]]
  ]) {
    const packet = searchGgaction(query);
    assert.deepEqual(packet.unresolved.map(entry => entry.constraint), unresolved, query);
    const { program } = await executeAuthoring(packet, { rows });
    assert.equal(program.semanticSpec.layers.length, 1, query);
    const [layer] = program.semanticSpec.layers;
    assert.equal(layer.mark.type, kind, query);
    const items = program.graphicSpec.objects[layer.id].items;
    assert.equal(items.length, count, query);
    if (unresolved.length > 0) {
      assert.ok(packet.unresolved.every(entry => entry.resources.length > 0), query);
      assert.deepEqual(docsFallbackResources(packet).map(resource => resource.uri), [
        "ggaction://docs/action-reference"
      ], query);
      continue;
    }
    assert.ok(Object.keys(layer.encoding).length >= 2, query);
    assert.ok(items.every(item => Object.keys(item.properties).length > 0), query);
    if (["arc", "line"].includes(kind)) {
      const coordinate = program.semanticSpec.coordinates.find(entry => entry.id === layer.coordinate);
      assert.equal(coordinate.type, "polar", query);
      assert.ok(layer.encoding.theta && (layer.encoding.radius || kind === "arc"), query);
    }
  }
});

test("raw mark requests remain distinct from incomplete chart requests", () => {
  for (const [query, action] of [["area mark", "createAreaMark"], ["tick mark", "createTickMark"]]) {
    const packet = searchGgaction(query);
    assert.deepEqual(packet.unresolved, [], query);
    assert.deepEqual(packet.actionPlan.map(entry => entry.name), [action], query);
  }
  assert.match(searchGgaction("area chart").unresolved[0].reason, /baseline|secondary/u);
  assert.match(searchGgaction("strip plot").unresolved[0].reason, /measure|placement/u);
});

test("specific polar phrases shadow only overlapping generic chart phrases", async () => {
  for (const query of ["radial bar chart", "polar area chart"]) {
    const packet = searchGgaction(query);
    assert.deepEqual(packet.matchedConstraints, ["chart.rose"], query);
    assert.equal(packet.actionPlan.some(entry => entry.name === "createBarPlot"), false, query);
    assert.equal(packet.actionPlan.some(entry => entry.name === "createAreaMark"), false, query);
  }
  const separate = searchGgaction("radial bar chart and bar chart");
  assert.ok(separate.matchedConstraints.includes("chart.rose"));
  assert.ok(separate.matchedConstraints.includes("chart.bar"));
  const { program } = await executeAuthoring(separate, { rows: [
    { value: 2, category: "A", series: "one" },
    { value: 3, category: "B", series: "one" }
  ] });
  assert.deepEqual(program.semanticSpec.layers.map(layer => layer.mark.type), ["arc", "bar"]);
});

test("intent taxonomy covers every supported constraint with exact owners", async () => {
  const [taxonomy, cards, schema] = await Promise.all([
    json("intent-taxonomy.json"),
    json("action-cards.json"),
    json("intent-taxonomy.schema.json")
  ]);
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate(taxonomy), true, JSON.stringify(validate.errors));
  assert.deepEqual(validateResolverKnowledge(), {
    cards: 174,
    constraints: 90,
    providers: 84,
    supported: 85,
    unsupported: 5
  });
  assert.equal(taxonomy.packageVersion, cards.packageVersion);
  const requiredFamilies = [
    "chart",
    "transform",
    "scale",
    "encoding",
    "guide",
    "layout",
    "selection",
    "renderer"
  ];
  for (const family of requiredFamilies) {
    assert.equal(
      taxonomy.constraints.some(constraint => constraint.id.startsWith(`${family}.`)),
      true,
      family
    );
  }
  assert.equal(cards.count, 174);

  const declarationByRuntime = {
    hconcat: "index.d.ts",
    vconcat: "index.d.ts",
    render: "index.d.ts",
    renderToSVG: "svg.d.ts",
    renderToPNG: "png.d.ts",
    renderToPDF: "pdf.d.ts"
  };
  for (const provider of taxonomy.providers.filter(entry => entry.kind === "runtime")) {
    const source = await readFile(path.join(typesRoot, declarationByRuntime[provider.name]), "utf8");
    assert.equal(provider.signature, runtimeSignature(source, provider.name), provider.id);
  }
});

test("every exact action name resolves to its compact card without gaps", async () => {
  const cards = await json("action-cards.json");
  for (const card of cards.cards) {
    const first = searchGgaction(card.name);
    const second = searchGgaction(card.name);
    assert.deepEqual(second, first, card.name);
    assert.deepEqual(first.matchedConstraints, [`action.${card.name}`], card.name);
    assert.equal(first.actionPlan.length, 1, card.name);
    assert.equal(first.actionPlan[0].id, `exact.${card.name}`, card.name);
    assert.equal(first.actionPlan[0].signature, card.signature, card.name);
    assert.equal(first.actionPlan[0].route, card.route, card.name);
    for (const option of card.options.filter(entry => entry.required)) {
      assert.equal(first.actionPlan[0].requiredOptions.includes(option.name), true, `${card.name}.${option.name}`);
    }
    assert.deepEqual(first.exactCalls, [card.snippet], card.name);
    assert.equal(first.schemaVersion, 4, card.name);
    assert.equal(first.packageVersion, cards.packageVersion, card.name);
    const prerequisites = authoringPrerequisites.filter(entry =>
      entry.id !== `action.${card.name}`
    );
    assert.deepEqual(first.authoring, {
      imports: ['import { chart } from "ggaction";'],
      initialize: "let program = chart()",
      prerequisites,
      steps: [`program = ${card.snippet}`]
    }, card.name);
    assert.deepEqual(first.appliedOptions, [], card.name);
    assert.equal(Array.isArray(first.placeholderBindings), true, card.name);
    assert.deepEqual(first.unmatchedRequirements, [], card.name);
    assert.deepEqual(first.unsupported, [], card.name);
    assert.deepEqual(first.unresolved, [], card.name);
    assert.equal(first.candidates.length, 1, card.name);
    assert.equal(taskPacketBytes(first) <= 6144, true, card.name);
  }
});

test("provides exact executable Canvas and SVG authoring bootstraps", async () => {
  const rows = [
    { x: 1, y: 4 },
    { x: 2, y: 7 },
    { x: 3, y: 6 },
    { x: 4, y: 10 }
  ];
  const svgPacket = searchGgaction("scatter plot as svg");
  assert.deepEqual(svgPacket.authoring, {
    imports: [
      'import { chart } from "ggaction";',
      'import { renderToSVG } from "ggaction/svg";'
    ],
    initialize: "let program = chart()",
    prerequisites: authoringPrerequisites,
    steps: [
      'program = program.createScatterPlot({ x: { field: "x", fieldType: "quantitative" }, y: { field: "y", fieldType: "quantitative" } })',
      "const output = renderToSVG(program)"
    ]
  });
  const svgResult = await executeAuthoring(svgPacket, { rows, renderer: "svg" });
  assert.equal(svgResult.output.startsWith("<svg"), true);
  assert.ok(svgResult.program.graphicSpec.objects.scatterPlot.items.length > 0);

  const legendPacket = searchGgaction(
    "scatter plot with a color legend at bottom as svg"
  );
  assert.deepEqual(legendPacket.actionPlan.map(entry => entry.id), [
    "action.createScatterPlot",
    "runtime.renderToSVG"
  ]);
  const legendResult = await executeAuthoring(legendPacket, {
    rows: rows.map((row, index) => ({ ...row, category: index % 2 ? "B" : "A" })),
    renderer: "svg"
  });
  assert.ok(legendResult.program.graphicSpec.objects.seriesLegendSymbols.items.length > 0);

  const canvasPacket = searchGgaction("scatter plot as browser canvas");
  assert.deepEqual(canvasPacket.authoring.imports, [
    'import { chart, render } from "ggaction";'
  ]);
  assert.equal(
    canvasPacket.authoring.steps.at(-1),
    "render(program, context)"
  );
  const canvasResult = await executeAuthoring(canvasPacket, { rows, renderer: "canvas" });
  assert.ok(canvasResult.program.graphicSpec.objects.scatterPlot.items.length > 0);

  const multiOutput = searchGgaction("scatter plot export svg and export png");
  assert.deepEqual(multiOutput.authoring.steps.slice(-2), [
    "const svgOutput = renderToSVG(program)",
    'const pngOutput = await renderToPNG(program, { output: "chart.png" })'
  ]);
});

test("prefers the complete reference-line phrase without hiding separate marks", () => {
  assert.deepEqual(
    searchGgaction("Use a reference line mark").matchedConstraints,
    ["mark.rule"]
  );
  assert.deepEqual(
    searchGgaction("Use a line mark and a reference line mark").matchedConstraints,
    ["mark.line", "mark.rule"]
  );
});

test("uses the regression owner for its fitted line and uncertainty ribbon", () => {
  const packet = searchGgaction(
    "Create a scatter plot with a fitted line and an uncertainty ribbon."
  );
  assert.deepEqual(packet.actionPlan.map(entry => entry.id), [
    "action.createScatterPlot",
    "action.createRegression"
  ]);
  assert.deepEqual(packet.actionPlan[1].constraints, [
    "statistics.regression",
    "statistics.errorBand"
  ]);
});

test("routes point-and-whisker language to the error-bar action", () => {
  const packet = searchGgaction("Create a grouped point-and-whisker plot.");
  assert.deepEqual(packet.matchedConstraints, ["statistics.errorBar"]);
  assert.deepEqual(packet.actionPlan.map(entry => entry.id), [
    "action.createErrorBar"
  ]);
});

test("injects an executable point source for an explicit regression-layer request", () => {
  const packet = searchGgaction(
    "Derive regression data, add a path mark with map to x and map to y, " +
    "create a trend line, add an uncertainty ribbon, and axis guides."
  );
  assert.deepEqual(packet.actionPlan.map(entry => entry.id), [
    "action.createPointMark",
    "action.encodeX",
    "action.encodeY",
    "action.createRegression",
    "action.createAxes"
  ]);
  assert.deepEqual(packet.actionPlan[3].constraints, [
    "mark.line",
    "transform.regression",
    "statistics.regression",
    "statistics.errorBand"
  ]);
  assert.deepEqual(packet.exactCalls, [
    "program.createPointMark({})",
    "program.encodeX({ field: \"x\" })",
    "program.encodeY({ field: \"y\" })",
    "program.createRegression({})",
    "program.createAxes({})"
  ]);

  const rows = [
    { x: 1, y: 4 },
    { x: 2, y: 7 },
    { x: 3, y: 6 },
    { x: 4, y: 10 }
  ];
  const program = chart()
    .createCanvas({
      width: 320,
      height: 220,
      margin: { top: 40, right: 40, bottom: 60, left: 60 }
    })
    .createData({ values: rows })
    .createPointMark({})
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createRegression({})
    .createAxes({});
  const canvas = createCanvas(320, 220);
  render(program, canvas.getContext("2d"));
  assert.ok(program.graphicSpec.objects.point.items.length > 0);
  assert.ok(program.graphicSpec.objects.pointRegressionLines.items.length > 0);
  assert.ok(program.graphicSpec.objects.pointRegressionBands.items.length > 0);
});

test("preserves request order only within one lifecycle priority", () => {
  const packet = searchGgaction(
    "Point mark with encode x, encode y, size encoding, shape encoding, opacity encoding, and axis guides."
  );
  assert.deepEqual(packet.actionPlan.map(entry => entry.id), [
    "action.createPointMark",
    "action.encodeX",
    "action.encodeY",
    "action.encodeSize",
    "action.encodeShape",
    "action.encodeOpacity",
    "action.createAxes"
  ]);

  const reversed = searchGgaction(
    "Use circle marks, map to y, map to x, encode opacity, encode size, then encode shape."
  );
  assert.deepEqual(reversed.actionPlan.map(entry => entry.id), [
    "action.createPointMark",
    "action.encodeY",
    "action.encodeX",
    "action.encodeOpacity",
    "action.encodeSize",
    "action.encodeShape"
  ]);
});

test("orders a positioned point before its inherited text overlay", async () => {
  const packet = searchGgaction(
    "Create circle marks, map to x, map to y, attach data labels with label field, avoid label overlap, and render SVG."
  );
  assert.deepEqual(packet.actionPlan.map(entry => entry.id), [
    "action.createPointMark",
    "action.encodeX",
    "action.encodeY",
    "action.createTextMark",
    "action.encodeText",
    "action.layoutLabels",
    "runtime.renderToSVG"
  ]);

  const { program, output } = await executeAuthoring(packet, {
    rows: [
      { x: 1, y: 2, label: "one" },
      { x: 2, y: 3, label: "two" },
      { x: 3, y: 4, label: "three" }
    ],
    renderer: "svg"
  });
  assert.equal(output.startsWith("<svg"), true);
  assert.equal(program.graphicSpec.objects.point.items.length, 3);
  assert.equal(program.graphicSpec.objects.text.items.length, 3);
});

test("connects a requested color scale to its facade legend owner", async () => {
  const packet = searchGgaction(
    "Use a color scale for a bar chart with an encoding key and axes on Canvas."
  );
  assert.deepEqual(packet.actionPlan.map(entry => entry.id), [
    "action.createColorScale",
    "action.createBarPlot",
    "runtime.render"
  ]);
  assert.match(packet.exactCalls[1], /color: \{ field: "category", scale: \{ id: "color-scale" \} \}/u);

  const { program } = await executeAuthoring(packet, {
    rows: [
      { category: "A", value: 3 },
      { category: "B", value: 5 },
      { category: "A", value: 7 }
    ],
    renderer: "canvas"
  });
  assert.ok(program.graphicSpec.objects.barPlot.items.length > 0);
  assert.ok(program.graphicSpec.objects.colorLegendSymbols.items.length > 0);
});

test("orders a raw bar category before its quantitative measure", async () => {
  const packet = searchGgaction(
    "Create bar mark; encode y, encode x, encode color, add chart grid and category order, using canvas renderer."
  );
  assert.deepEqual(packet.actionPlan.map(entry => entry.id), [
    "action.createBarMark",
    "action.encodeX",
    "action.encodeY",
    "action.encodeColor",
    "action.createGrid",
    "action.orderCategories",
    "runtime.render"
  ]);

  const { program } = await executeAuthoring(packet, {
    rows: [
      { category: "B", value: 5 },
      { category: "A", value: 3 },
      { category: "C", value: 7 }
    ],
    renderer: "canvas"
  });
  assert.equal(program.graphicSpec.objects.bar.items.length, 3);
  assert.ok(program.graphicSpec.objects.horizontalGridLines.items.length > 0);
});

test("keeps incomplete rule endpoints open and preserves requested appearance text", async () => {
  const incomplete = searchGgaction(
    "Create rule mark, encode x, encode y, encode stroke width, add grid lines and title and subtitle, on Canvas."
  );
  assert.deepEqual(incomplete.matchedConstraints, [
    "mark.rule",
    "encoding.x",
    "encoding.y",
    "encoding.strokeWidth",
    "guide.grid",
    "guide.title",
    "guide.subtitle",
    "renderer.canvas"
  ]);
  assert.deepEqual(
    incomplete.unresolved.map(entry => entry.constraint),
    ["encoding.rule.endpoint"]
  );
  assert.match(incomplete.exactCalls.at(-2), /subtitle: "Chart subtitle"/u);

  const complete = searchGgaction(
    "Create rule mark, encode y, encode stroke width, add grid lines and title and subtitle, on Canvas."
  );
  assert.deepEqual(complete.unresolved, []);
  const { program } = await executeAuthoring(complete, {
    rows: [{ y: 2 }, { y: 5 }, { y: 7 }],
    renderer: "canvas"
  });
  assert.equal(program.graphicSpec.objects.rule.items.length, 3);
  assert.ok(program.graphicSpec.objects.horizontalGridLines.items.length > 0);
  assert.equal(program.semanticSpec.title.subtitle, "Chart subtitle");
});

test("keeps terminal unsupported output separate from open renderer decisions", () => {
  const unsupportedOnly = searchGgaction("Build a bar plot and render JPEG.");
  assert.deepEqual(
    unsupportedOnly.unsupported.map(entry => entry.constraint),
    ["unsupported.jpg"]
  );
  assert.deepEqual(
    unsupportedOnly.unresolved.map(entry => entry.constraint),
    ["renderer.format"]
  );
  assert.deepEqual(
    docsFallbackResources(unsupportedOnly).map(resource => resource.uri),
    ["ggaction://docs/choose-renderer"]
  );

  const withSupportedAlternative = searchGgaction(
    "Build a bar plot, export PDF, and also export JPG."
  );
  assert.deepEqual(
    withSupportedAlternative.unsupported.map(entry => entry.constraint),
    ["unsupported.jpg"]
  );
  assert.deepEqual(withSupportedAlternative.unresolved, []);
  assert.deepEqual(
    docsFallbackResources(withSupportedAlternative).map(resource => resource.uri),
    []
  );
});

test("reports concrete options, placeholders, and unsupported requirements without silent partials", () => {
  const horizon = searchGgaction("horizon chart with three bands");
  assert.deepEqual(horizon.actionPlan.map(entry => entry.id), [
    "action.createAreaMark",
    "action.createHorizonChart"
  ]);
  assert.deepEqual(horizon.appliedOptions, [{
    owner: "encodeHorizon",
    option: "bands",
    value: "3",
    source: "three bands"
  }]);
  assert.deepEqual(horizon.unmatchedRequirements, []);

  const legend = searchGgaction(
    "line chart with color legend at bottom, 3 columns, horizontal direction as svg"
  );
  assert.match(legend.exactCalls[0], /position: "bottom", columns: 3, direction: "horizontal"/);
  assert.deepEqual(legend.appliedOptions.map(entry => entry.option), ["guides"]);
  assert.deepEqual(legend.unresolved, []);

  const bins = searchGgaction(
    "bin2d with 20 x-bins and 30 y-bins, include empty cells"
  );
  assert.deepEqual(bins.appliedOptions.map(entry => [entry.option, entry.value]), [
    ["bins", "{ x: 20, y: 30 }"],
    ["includeEmpty", "true"]
  ]);
  const oneAxis = searchGgaction("bin2d with 20 x-bins");
  assert.deepEqual(oneAxis.unmatchedRequirements, ["20 x-bins"]);
  assert.deepEqual(oneAxis.unresolved.map(entry => entry.constraint), [
    "transform.bin2d.bins.y"
  ]);
  const heatmapBins = searchGgaction("heatmap with 20 bins and include empty cells");
  assert.equal(
    heatmapBins.exactCalls[0],
    'program.createHeatmap({ x: "x", y: "y", bin: { bins: 20, includeEmpty: true } })'
  );
  const histogramBins = searchGgaction("histogram with 12 bins");
  assert.match(histogramBins.exactCalls[0], /maxBins: 12/);

  const fields = searchGgaction(
    "scatter plot with x field horsepower y field mpg color field origin size field weight"
  );
  assert.deepEqual(fields.appliedOptions.map(entry => [entry.option, entry.value]), [
    ["x", '"horsepower"'],
    ["y", '"mpg"'],
    ["color", '"origin"'],
    ["size", '"weight"']
  ]);
  assert.deepEqual(fields.placeholderBindings.filter(entry => entry.kind === "field")
    .map(entry => entry.name), ["horsepower", "mpg", "origin", "weight"]);
  const terseFields = searchGgaction("scatter plot x horsepower y mpg as svg");
  assert.deepEqual(terseFields.appliedOptions.map(entry => [entry.option, entry.value]), [
    ["x", '"horsepower"'],
    ["y", '"mpg"']
  ]);
  assert.deepEqual(terseFields.placeholderBindings.filter(entry => entry.kind === "field")
    .map(entry => entry.name), ["horsepower", "mpg"]);
  const versusFields = searchGgaction("scatter plot of mpg vs horsepower as svg");
  assert.match(versusFields.exactCalls[0], /x: "horsepower", y: "mpg"/);

  const title = searchGgaction(
    'chart title "Revenue" subtitle "Quarterly" font size 18'
  );
  assert.equal(
    title.exactCalls[0],
    'program.createTitle({ text: "Revenue", subtitle: "Quarterly", titleStyle: { fontSize: 18 } })'
  );
  assert.deepEqual(title.placeholderBindings.map(entry => entry.name), ["values"]);
  const naturalTitle = searchGgaction("scatter plot titled Sales font size 20 as svg");
  assert.equal(
    naturalTitle.exactCalls[1],
    'program.createTitle({ text: "Sales", titleStyle: { fontSize: 20 } })'
  );
  const unscopedFont = searchGgaction("scatter plot with font size 20 as svg");
  assert.deepEqual(unscopedFont.unmatchedRequirements, ["font size 20"]);

  const missingLegendChannel = searchGgaction(
    "scatter plot with horizontal legend at bottom as svg"
  );
  assert.equal(missingLegendChannel.exactCalls[0].includes("legend"), false);
  assert.deepEqual(missingLegendChannel.unmatchedRequirements, ["legend channel"]);
  assert.deepEqual(missingLegendChannel.unresolved.map(entry => entry.constraint), [
    "guide.legend",
    "layout.legend.bottom"
  ]);
  const unscopedColumns = searchGgaction("bar chart with 3 columns as svg");
  assert.deepEqual(unscopedColumns.unmatchedRequirements, ["3 columns"]);

  const horizontalBar = searchGgaction("horizontal bar chart as svg");
  assert.deepEqual(horizontalBar.exactCalls.slice(0, 3), [
    'program.createBarMark({ id: "bar" })',
    'program.encodeY({ field: "category", fieldType: "nominal" })',
    'program.encodeX({ field: "value", fieldType: "quantitative" })'
  ]);
  const pie = searchGgaction("pie chart");
  assert.deepEqual(pie.exactCalls.slice(0, 3), [
    'program.createArcMark({ innerRadius: 0 })',
    'program.encodeTheta({ field: "value", fieldType: "quantitative" })',
    'program.encodeColor({ field: "category" })'
  ]);
  const canvas = searchGgaction("scatter plot as canvas");
  assert.equal(canvas.exactCalls.at(-1), "render(program, context)");
  assert.equal(canvas.placeholderBindings.some(entry => entry.name === "context"), true);

  const pngRatio = searchGgaction("scatter plot as png pixel ratio 2");
  assert.match(pngRatio.exactCalls.at(-1), /pixelRatio: 2/);
  const svgRatio = searchGgaction("scatter plot as svg pixel ratio 2");
  assert.deepEqual(svgRatio.unmatchedRequirements, ["pixel ratio 2"]);
  assert.deepEqual(svgRatio.unresolved.map(entry => entry.constraint), [
    "renderer.pixelRatio"
  ]);

  const accessible = searchGgaction(
    'scatter plot as svg with svg title "Fuel economy" description "MPG by horsepower" accessible'
  );
  assert.deepEqual(accessible.appliedOptions.map(entry => entry.option), [
    "title",
    "description"
  ]);
  assert.deepEqual(accessible.unresolved, []);

  const missingAccessibleText = searchGgaction("accessible scatter plot as svg");
  assert.deepEqual(missingAccessibleText.unmatchedRequirements, ["accessible output"]);
  assert.deepEqual(missingAccessibleText.unresolved.map(entry => entry.constraint), [
    "renderer.svg.accessibleText"
  ]);
  assert.deepEqual(
    docsFallbackResources(missingAccessibleText).map(resource => resource.uri),
    ["ggaction://docs/accessibility"]
  );

  const responsive = searchGgaction("responsive scatter plot");
  assert.deepEqual(responsive.unmatchedRequirements, ["responsive"]);
  assert.deepEqual(responsive.unresolved.map(entry => entry.constraint), [
    "layout.responsive"
  ]);

  const interaction = searchGgaction("scatter plot with tooltip and hover interaction");
  assert.deepEqual(interaction.unsupported.map(entry => entry.constraint), [
    "unsupported.interaction"
  ]);
  const areaDash = searchGgaction("area chart with dashed stroke");
  assert.equal(areaDash.actionPlan.some(entry => entry.name === "encodeStrokeDash"), false);
  assert.deepEqual(areaDash.unsupported.map(entry => entry.constraint), [
    "unsupported.areaStrokeDash"
  ]);
});

test("design fixtures prove bounded one-call task closure without silent partials", async () => {
  const [fixtures, schema] = await Promise.all([
    json("task-closure-cases.json"),
    json("task-packet.schema.json")
  ]);
  assert.equal(fixtures.role, "resolver-design-fixtures-not-evaluation-corpus");
  assert.equal(schema.properties.schemaVersion.const, 4);
  assert.deepEqual(schema.properties.authoring.required, [
    "imports",
    "initialize",
    "prerequisites",
    "steps"
  ]);
  assert.equal(schema.properties.authoring.properties.imports.maxItems, 4);
  assert.equal(schema.properties.authoring.properties.prerequisites.minItems, 0);
  assert.equal(schema.properties.authoring.properties.steps.maxItems, 20);
  const validatePacket = new Ajv2020({ strict: true }).compile(schema);
  const sizes = [];
  for (const fixture of fixtures.cases) {
    const packet = searchGgaction(fixture.query);
    assert.equal(
      validatePacket(packet),
      true,
      `${fixture.id}: ${JSON.stringify(validatePacket.errors)}`
    );
    assert.deepEqual(Object.keys(packet).sort(), [...schema.required].sort(), fixture.id);
    assert.deepEqual(packet.matchedConstraints, fixture.constraints, fixture.id);
    assert.deepEqual(
      packet.actionPlan.map(entry => ({
        id: entry.id,
        options: [...entry.requiredOptions].sort()
      })),
      fixture.plan.map(entry => ({
        id: entry.id,
        options: [...entry.options].sort()
      })),
      fixture.id
    );
    assert.deepEqual(
      packet.unresolved.map(entry => entry.constraint),
      fixture.unresolved,
      fixture.id
    );
    assert.deepEqual(
      packet.unsupported.map(entry => entry.constraint),
      fixture.unsupported ?? [],
      fixture.id
    );
    const covered = new Set(packet.actionPlan.flatMap(entry => entry.constraints));
    const unresolved = new Set(packet.unresolved.map(entry => entry.constraint));
    const unsupported = new Set(packet.unsupported.map(entry => entry.constraint));
    for (const constraint of packet.matchedConstraints) {
      assert.equal(
        covered.has(constraint) || unresolved.has(constraint) || unsupported.has(constraint),
        true,
        `${fixture.id}: ${constraint}`
      );
    }
    assert.equal(packet.exactCalls.length, packet.actionPlan.length, fixture.id);
    assert.equal(packet.candidates.length <= 3, true, fixture.id);
    const bytes = taskPacketBytes(packet);
    assert.equal(bytes <= 6144, true, fixture.id);
    sizes.push(bytes);
  }
  sizes.sort((left, right) => left - right);
  assert.equal(Math.max(...sizes) <= 6144, true);
  assert.equal(sizes[Math.floor(sizes.length / 2)] <= 4096, true);
});

test("every supported constraint and design-fixture authoring step type-checks", async () => {
  const [taxonomy, cards, fixtures] = await Promise.all([
    json("intent-taxonomy.json"),
    json("action-cards.json"),
    json("task-closure-cases.json")
  ]);
  const calls = new Set(cards.cards.map(card => searchGgaction(card.name).exactCalls[0]));
  const authoringSteps = new Set(cards.cards.flatMap(card =>
    searchGgaction(card.name).authoring.steps
  ));
  for (const constraint of taxonomy.constraints.filter(entry => entry.unsupported === undefined)) {
    const packet = searchGgaction(constraint.phrases[0]);
    assert.equal(packet.matchedConstraints.includes(constraint.id), true, constraint.id);
    const covered = packet.actionPlan.flatMap(entry => entry.constraints);
    if (
      constraint.id === "guide.legend" ||
      constraint.id.startsWith("layout.legend.")
    ) {
      assert.equal(covered.includes(constraint.id), false, constraint.id);
      assert.equal(packet.unresolved.some(entry => entry.constraint === constraint.id), true);
      continue;
    }
    assert.equal(covered.includes(constraint.id), true, constraint.id);
    assert.equal(packet.unresolved.some(entry => entry.constraint === constraint.id), false, constraint.id);
    for (const call of packet.exactCalls) calls.add(call);
    for (const step of packet.authoring.steps) authoringSteps.add(step);
  }
  for (const fixture of fixtures.cases) {
    const packet = searchGgaction(fixture.query);
    for (const call of packet.exactCalls) calls.add(call);
    for (const step of packet.authoring.steps) authoringSteps.add(step);
  }
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ggaction-task-resolver-"));
  try {
    for (const name of ["program.d.ts", "index.d.ts", "svg.d.ts", "png.d.ts", "pdf.d.ts"]) {
      await copyFile(path.join(typesRoot, name), path.join(temporary, name));
    }
    const source = [
      'import type { ChartProgram } from "./program.js";',
      'import { chart, hconcat, render, vconcat } from "./index.js";',
      'import { renderToSVG } from "./svg.js";',
      'import { renderToPNG } from "./png.js";',
      'import { renderToPDF } from "./pdf.js";',
      "declare let program: ChartProgram;",
      "declare const context: CanvasRenderingContext2D;",
      "declare const values: readonly Record<string, unknown>[];",
      "async function verifyCompactCalls() {",
      ...[...calls].map(call => `  ${call};`),
      ...[...authoringSteps].flatMap(step => [
        "  {",
        "    let program = chart();",
        `    ${step};`,
        "  }"
      ]),
      "}",
      "void verifyCompactCalls;",
      ""
    ].join("\n");
    const sourceFile = path.join(temporary, "resolver-calls.ts");
    await writeFile(sourceFile, source);
    const result = spawnSync(tscFile, [
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--target", "ES2022",
      "--module", "NodeNext",
      "--moduleResolution", "NodeNext",
      sourceFile
    ], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("task packets reject ambiguous, unsupported, empty, and oversized input explicitly", () => {
  const conflict = searchGgaction("legend at top and legend at bottom");
  assert.deepEqual(conflict.unresolved.map(entry => entry.constraint), [
    "layout.legend.bottom",
    "layout.legend.top",
    "guide.legend"
  ]);
  assert.equal(conflict.actionPlan.some(entry => entry.name === "editLegendLayout"), false);

  const geo = searchGgaction("map chart");
  assert.deepEqual(geo.unsupported.map(entry => entry.constraint), ["unsupported.geo"]);
  assert.deepEqual(geo.unresolved, []);
  assert.throws(() => searchGgaction(""), /non-empty string/);
  assert.throws(() => searchGgaction("x".repeat(501)), /at most 500 characters/);

  const dense = [
    "createCanvas", "createData", "createPointMark", "createTickMark",
    "createTextMark", "createLineMark", "createBarMark", "createAreaMark",
    "createRuleMark", "createArcMark", "createRectMark", "encodeX",
    "encodeY", "encodeColor", "encodeSize", "encodeShape", "createAxes",
    "createLegend", "createGrid", "createTitle"
  ].join(" ");
  assert.equal(dense.length <= 500, true);
  assert.throws(() => searchGgaction(dense), /hard ceiling is 6144 bytes/);
});

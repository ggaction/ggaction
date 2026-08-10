import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

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

test("intent taxonomy covers every supported constraint with exact owners", async () => {
  const [taxonomy, cards] = await Promise.all([
    json("intent-taxonomy.json"),
    json("action-cards.json")
  ]);
  assert.deepEqual(validateResolverKnowledge(), {
    cards: 173,
    constraints: 80,
    providers: 74,
    supported: 75,
    unsupported: 5
  });
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
  assert.equal(cards.count, 173);

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
    assert.equal(first.schemaVersion, 3, card.name);
    assert.deepEqual(first.authoring, {
      imports: ['import { chart } from "ggaction";'],
      initialize: "let program = chart()",
      prerequisites: authoringPrerequisites,
      steps: [`program = ${card.snippet}`]
    }, card.name);
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
    .createCanvas({ width: 320, height: 220, margin: 40 })
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

test("design fixtures prove bounded one-call task closure without silent partials", async () => {
  const [fixtures, schema] = await Promise.all([
    json("task-closure-cases.json"),
    json("task-packet.schema.json")
  ]);
  assert.equal(fixtures.role, "resolver-design-fixtures-not-evaluation-corpus");
  assert.equal(schema.properties.schemaVersion.const, 3);
  assert.deepEqual(schema.properties.authoring.required, [
    "imports",
    "initialize",
    "prerequisites",
    "steps"
  ]);
  assert.equal(schema.properties.authoring.properties.imports.maxItems, 4);
  assert.equal(schema.properties.authoring.properties.steps.maxItems, 20);
  const sizes = [];
  for (const fixture of fixtures.cases) {
    const packet = searchGgaction(fixture.query);
    assert.deepEqual(Object.keys(packet).sort(), [...schema.required].sort(), fixture.id);
    assert.deepEqual(packet.matchedConstraints, fixture.constraints, fixture.id);
    assert.deepEqual(
      packet.actionPlan.map(entry => ({ id: entry.id, options: entry.requiredOptions })),
      fixture.plan,
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
    "layout.legend.top"
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

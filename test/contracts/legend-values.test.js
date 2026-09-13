import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chart, render } from "../../src/index.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { createMockCanvasContext, findCanvasCalls } from "../support/canvas.js";

const root = fileURLToPath(new URL("../../", import.meta.url));

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function snapshot(program) {
  return JSON.stringify({
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    guideConfigs: program.guideConfigs,
    trace: program.trace
  });
}

function pointBase() {
  return chart()
    .createCanvas({
      width: 760,
      height: 600,
      margin: { top: 160, right: 240, bottom: 160, left: 90 }
    })
    .createData({
      id: "values",
      values: [
        { x: 0, y: 0, value: 0, group: "A" },
        { x: 1, y: 1, value: 50, group: "A" },
        { x: 2, y: 0, value: 100, group: "B" }
      ]
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

function sizeBase() {
  return pointBase().encodeSize({
    field: "value",
    scale: { domain: [0, 100], range: [0, 100 * Math.PI] }
  });
}

function opacityBase() {
  return pointBase().encodeOpacity({
    field: "value",
    scale: { domain: [0, 100], range: [0, 1] }
  });
}

function widthBase() {
  return chart()
    .createCanvas({
      width: 760,
      height: 440,
      margin: { top: 90, right: 240, bottom: 90, left: 90 }
    })
    .createData({
      id: "lines-data",
      values: [
        { x: 0, y: 0, value: 0, group: "A" },
        { x: 1, y: 1, value: 0, group: "A" },
        { x: 0, y: 1, value: 100, group: "B" },
        { x: 1, y: 0, value: 100, group: "B" }
      ]
    })
    .createLineMark({ id: "lines" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeGroup({ field: "group" })
    .encodeStrokeWidth({
      field: "value",
      scale: { domain: [0, 100], range: [0, 10] }
    });
}

function texts(program, prefix) {
  return program.graphicSpec.objects[`${prefix}Labels`].items.map(
    item => item.properties.text
  );
}

test("stores exact size samples without changing the scale or mark mapping", () => {
  const base = sizeBase();
  const beforeScale = structuredClone(base.semanticSpec.scales.find(
    scale => scale.id === "size"
  ));
  const beforeMarks = structuredClone(base.graphicSpec.objects.points.items);
  const options = deepFreeze({
    target: "points",
    channels: ["size"],
    values: [10, 50, 100]
  });
  const program = base.createLegend(options);

  assert.deepEqual(program.guideConfigs.legend.size.sampling, {
    mode: "values",
    values: [10, 50, 100],
    count: 5
  });
  assert.equal(Object.hasOwn(program.guideConfigs.legend.size, "count"), false);
  assert.deepEqual(texts(program, "sizeLegend"), ["10", "50", "100"]);
  const radii = program.graphicSpec.objects.sizeLegendSymbols.items.map(
    item => item.properties.radius
  );
  [Math.sqrt(10), Math.sqrt(50), 10].forEach((expected, index) => {
    assert.ok(Math.abs(radii[index] - expected) < 1e-10);
  });
  assert.deepEqual(
    program.semanticSpec.scales.find(scale => scale.id === "size"),
    beforeScale
  );
  assert.deepEqual(program.graphicSpec.objects.points.items, beforeMarks);
  assert.deepEqual(options.values, [10, 50, 100]);

  const lowerLevelEquivalent = base
    .createLegend({ channels: ["size"], count: 3 })
    .editGraphics({
      target: "sizeLegendSymbols",
      property: "radius",
      value: [Math.sqrt(10), Math.sqrt(50), 10]
    })
    .editGraphics({
      target: "sizeLegendLabels",
      property: "text",
      value: ["10", "50", "100"]
    });
  assert.deepEqual(program.graphicSpec, lowerLevelEquivalent.graphicSpec);
});

test("maps exact opacity and stroke-width samples through their real scales", () => {
  const opacity = opacityBase().createLegend({
    channels: ["opacity"],
    values: [0, 25, 100]
  });
  assert.deepEqual(texts(opacity, "opacityLegend"), ["0", "25", "100"]);
  assert.deepEqual(
    opacity.graphicSpec.objects.opacityLegendSymbols.items.map(
      item => item.properties.opacity
    ),
    [0, 0.25, 1]
  );
  assert.equal(opacity.graphicSpec.objects.opacityLegendSymbols.items.length, 3);

  const reversed = opacity.editScale({ id: "opacity", reverse: true });
  assert.deepEqual(texts(reversed, "opacityLegend"), ["0", "25", "100"]);
  assert.deepEqual(
    reversed.graphicSpec.objects.opacityLegendSymbols.items.map(
      item => item.properties.opacity
    ),
    [1, 0.75, 0]
  );
  const single = opacityBase().createLegend({
    channels: ["opacity"],
    position: "top",
    values: [0]
  });
  assert.deepEqual(texts(single, "opacityLegend"), ["0"]);
  assert.equal(
    Number.isFinite(
      single.graphicSpec.objects.opacityLegendSymbols.items[0].properties.x
    ),
    true
  );

  const width = widthBase().createLegend({
    channels: ["strokeWidth"],
    values: [0, 50, 100]
  });
  assert.deepEqual(texts(width, "strokeWidthLegend"), ["0", "50", "100"]);
  assert.deepEqual(
    width.graphicSpec.objects.strokeWidthLegendSymbols.items.map(
      item => item.properties.strokeWidth
    ),
    [0, 5, 10]
  );
});

test("preserves the automatic count while entering, replacing, and leaving exact mode", () => {
  const automatic = sizeBase().createLegend({
    channels: ["size"],
    count: 5
  });
  assert.deepEqual(automatic.guideConfigs.legend.size.sampling, {
    mode: "auto",
    count: 5
  });

  const exactOptions = deepFreeze({ values: [10, 50, 100] });
  const exact = automatic.editLegend(exactOptions);
  assert.deepEqual(exact.guideConfigs.legend.size.sampling, {
    mode: "values",
    values: [10, 50, 100],
    count: 5
  });
  assert.deepEqual(exactOptions, { values: [10, 50, 100] });
  const replaced = exact.editLegend({ values: [20, 80] });
  assert.deepEqual(replaced.guideConfigs.legend.size.sampling, {
    mode: "values",
    values: [20, 80],
    count: 5
  });
  const exactBeforeRejectedCount = snapshot(exact);
  assert.throws(
    () => exact.editLegend({ count: 4 }),
    /cannot replace exact values/
  );
  assert.equal(snapshot(exact), exactBeforeRejectedCount);

  const restored = exact.editLegend({ values: "auto" });
  assert.deepEqual(restored.guideConfigs.legend.size.sampling, {
    mode: "auto",
    count: 5
  });
  assert.equal(restored.graphicSpec.objects.sizeLegendSymbols.items.length, 5);
  const recounted = exact.editLegend({ values: "auto", count: 4 });
  assert.deepEqual(recounted.guideConfigs.legend.size.sampling, {
    mode: "auto",
    count: 4
  });
});

test("rejects malformed, conflicting, unsupported, and out-of-domain values atomically", () => {
  const base = sizeBase();
  const before = snapshot(base);
  const invalid = [
    { values: [] },
    { values: [50, 10] },
    { values: [10, 10] },
    { values: [-0, 0] },
    { values: [Number.NaN] },
    { values: Array.from({ length: 101 }, (_, index) => index) },
    { values: [-1, 50] },
    { values: [10, 50], count: 3 },
    { values: "auto" }
  ];
  for (const options of invalid) {
    assert.throws(
      () => base.createLegend({ channels: ["size"], ...options }),
      /values|count|domain|automatic/
    );
    assert.equal(snapshot(base), before);
  }

  const discrete = pointBase().encodeSize({
    field: "value",
    scale: { type: "threshold", domain: [25, 75], range: [4, 16, 64] }
  });
  assert.throws(
    () => discrete.createLegend({ channels: ["size"], values: [25, 75] }),
    /Discrete size legends/
  );
  const discreteLegend = discrete.createLegend({ channels: ["size"] });
  const restyledDiscrete = discreteLegend.editLegend({
    labels: { color: "#334455" }
  });
  assert.equal(restyledDiscrete.guideConfigs.legend.size.count, 3);
  assert.equal(
    Object.hasOwn(restyledDiscrete.guideConfigs.legend.size, "sampling"),
    false
  );
  const combined = sizeBase().encodeColor({
    field: "group",
    fieldType: "nominal"
  });
  assert.throws(
    () => combined.createLegend({
      channels: ["color", "size"],
      values: [10, 50]
    }),
    /channel block selector/
  );
  const multipleSampled = sizeBase()
    .encodeOpacity({
      field: "value",
      scale: { domain: [0, 100], range: [0, 1] }
    })
    .createLegend({ channels: ["size"] })
    .createLegend({ channels: ["opacity"] });
  assert.throws(
    () => multipleSampled.editLegend({ values: [0, 50, 100] }),
    /multiple legend blocks.*channel block selector/
  );
  const gradient = pointBase().encodeColor({
    field: "value",
    fieldType: "quantitative"
  });
  assert.throws(
    () => gradient.createLegend({ channels: ["color"], values: [10, 50] }),
    /Gradient legends do not support/
  );
});

test("rejects a scale edit when stored exact samples become invalid", () => {
  const program = sizeBase().createLegend({
    channels: ["size"],
    values: [10, 50, 100]
  });
  const before = snapshot(program);
  assert.throws(
    () => program.editScale({ id: "size", domain: [0, 40] }),
    /exact value 50 is outside the scale domain/
  );
  assert.equal(snapshot(program), before);

  const logarithmic = chart()
    .createCanvas({
      width: 760,
      height: 440,
      margin: { top: 90, right: 240, bottom: 90, left: 90 }
    })
    .createData({ values: [
      { x: 0, y: 0, value: 1 },
      { x: 1, y: 1, value: 10 },
      { x: 2, y: 0, value: 100 }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeSize({
    field: "value",
    scale: { type: "log", domain: [1, 100], range: [4, 100] }
  })
    .createLegend({ channels: ["size"], values: [1, 10, 100] });
  assert.deepEqual(texts(logarithmic, "sizeLegend"), ["1", "10", "100"]);
});

test("rejects a data rebind when its inferred domain invalidates exact samples", () => {
  const program = pointBase()
    .encodeSize({
      field: "value",
      scale: { range: [0, 100 * Math.PI] }
    })
    .createLegend({ channels: ["size"], values: [0, 50, 100] })
    .createData({
      id: "narrow-values",
      values: [
        { x: 0, y: 0, value: 0 },
        { x: 1, y: 1, value: 40 }
      ]
    });
  const before = snapshot(program);
  assert.throws(
    () => program.bindMarkData({ target: "points", data: "narrow-values" }),
    /exact value 50 is outside the scale domain \[0, 40\]/
  );
  assert.equal(snapshot(program), before);
});

test("validates exact samples against shared and independent facet domains", () => {
  const source = chart()
    .createCanvas({
      width: 700,
      height: 420,
      margin: { top: 50, right: 210, bottom: 60, left: 70 }
    })
    .createData({
      id: "facet-values",
      values: [
        { x: 0, y: 0, value: 0, group: "A" },
        { x: 1, y: 1, value: 40, group: "A" },
        { x: 0, y: 1, value: 60, group: "B" },
        { x: 1, y: 0, value: 100, group: "B" }
      ]
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeSize({ field: "value", scale: { range: [0, 100] } })
    .createLegend({ channels: ["size"], values: [0, 40, 100] });

  const shared = source.facet({
    field: "group",
    scales: { size: "shared" },
    guides: { legend: "shared" }
  });
  assert.deepEqual(shared.guideConfigs.legend.size.sampling.values, [0, 40, 100]);
  assert.deepEqual(texts(shared, "sizeLegend"), ["0", "40", "100"]);
  assert.throws(
    () => source.facet({
      field: "group",
      scales: { size: "independent" },
      guides: { legend: "shared" }
    }),
    /outside the scale domain \[0, 40\]/
  );
});

test("keeps exact values through theme, layout, Canvas, and every renderer", async t => {
  const exact = opacityBase().createLegend({
    channels: ["opacity"],
    values: [0, 25, 100]
  });
  const replayed = exact
    .editLegend({ position: "top", align: "center" })
    .applyTheme({ theme: "dark" })
    .editCanvas({ width: 820 });
  assert.deepEqual(replayed.guideConfigs.legend.opacity.sampling, {
    mode: "values",
    values: [0, 25, 100],
    count: 5
  });
  assert.deepEqual(texts(replayed, "opacityLegend"), ["0", "25", "100"]);
  assert.deepEqual(
    replayed.graphicSpec.objects.opacityLegendSymbols.items.map(
      item => item.properties.opacity
    ),
    [0, 0.25, 1]
  );

  const context = createMockCanvasContext();
  render(replayed, context);
  assert.equal(findCanvasCalls(context, "fill").length > 0, true);
  const svg = renderToSVG(replayed, { title: "Exact legend values" });
  assert.match(svg, /^<svg /);
  assert.match(svg, />25<\/text>/);

  const directory = await mkdtemp(join(tmpdir(), "ggaction-legend-values-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pngPath = join(directory, "legend-values.png");
  const png = await renderToPNG(replayed, { output: pngPath, pixelRatio: 1 });
  assert.deepEqual({ width: png.width, height: png.height }, {
    width: 820,
    height: 600
  });
  assert.deepEqual(
    [...(await readFile(pngPath)).subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10]
  );
  const pdfPath = join(directory, "legend-values.pdf");
  const pdf = await renderToPDF(replayed, { output: pdfPath });
  assert.deepEqual({ width: pdf.width, height: pdf.height, pages: pdf.pages }, {
    width: 820,
    height: 600,
    pages: 1
  });
  assert.match((await readFile(pdfPath)).toString("latin1"), /^%PDF-/);
});

test("declares exact legend sample values for create, edit, and guide facades", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ggaction-legend-values-types-"));
  try {
    const file = join(directory, "legend-values.mts");
    await writeFile(file, `
import type { ChartProgram, LegendOptions, EditLegendOptions } from ${JSON.stringify(join(root, "types/index.js"))};
declare const p: ChartProgram;
const create: LegendOptions = { channels: ["size"], values: [10, 50, 100] };
const edit: EditLegendOptions = { values: "auto", count: 5 };
p.createLegend(create);
p.editLegend(edit);
p.createGuides({ legend: { channels: ["opacity"], values: [0, 0.5, 1] } });
p.editLegend({ values: [1] });
// @ts-expect-error Creation cannot use the edit-only auto reset.
p.createLegend({ channels: ["size"], values: "auto" });
// @ts-expect-error Exact legend samples are numeric.
p.editLegend({ values: ["10"] });
`);
    const result = spawnSync(join(root, "node_modules/.bin/tsc"), [
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

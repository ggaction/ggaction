import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import { chart } from "../../src/index.js";
import { documentationCodeBlocks } from "../../scripts/doc-snippets.js";

const directory = fileURLToPath(new URL("../../.artifacts/test/docs/behavior/", import.meta.url));
await mkdir(directory, { recursive: true });
async function blocks(file) {
  return documentationCodeBlocks(await readFile(new URL(`../../docs/${file}`, import.meta.url), "utf8"))
    .filter(block => block.language === "javascript");
}
async function module(name, source) {
  const file = path.join(directory, `${name}.mjs`);
  await writeFile(file, source);
  return import(pathToFileURL(file));
}

test("the README authoring sequence completes with the repository cars data and its legend", async () => {
  const readme = await readFile(new URL("../../README.md", import.meta.url), "utf8");
  const snippet = documentationCodeBlocks(readme).find(block =>
    block.language === "javascript" && block.code.includes(".createRegression()")
  );
  assert.ok(snippet);
  const cars = JSON.parse(await readFile(new URL("../../data/cars.json", import.meta.url), "utf8"));
  const { program } = await module("readme-authoring", `const cars = ${JSON.stringify(cars)};\n${snippet.code}\nexport { program };`);
  assert.equal(cars.length, 406);
  assert.equal(program.semanticSpec.datasets[0].values.length, cars.length);
  assert.equal(program.trace.children.at(-1).op, "createGuides");
  assert.ok(Object.keys(program.semanticSpec.guides.legend).length > 0);
  assert.equal(program.graphicSpec.objects.points.items.length, cars.length);
});

test("the documented empty filter preserves its source and stores the named empty result", async () => {
  const code = (await blocks("troubleshooting.md")).find(block => block.heading === "A filter produces an empty mark").code;
  const original = chart().createData({ id: "source", values: [{ Origin: "Europe" }] });
  const filtered = new Function("program", `${code}\nreturn filtered;`)(original);
  assert.deepEqual(filtered.semanticSpec.datasets.find(data => data.id === "selectedOrigins").values, []);
  assert.deepEqual(filtered.semanticSpec.datasets.find(data => data.id === "source").values, [{ Origin: "Europe" }]);
  assert.equal(original.semanticSpec.datasets.length, 1);
});

test("the LLM task fragments independently build histogram and regression programs", async () => {
  const code = await blocks("llm-authoring.md");
  const bootstrap = code.find(block => block.heading === "Complete program bootstrap").code;
  const alternatives = code.filter(block => block.heading === "Common task families").map(block => block.code);
  assert.equal(alternatives.length, 2);
  const fixture = [{ value: 1, x: 1, y: 2 }, { value: 2, x: 2, y: 5 }, { value: 4, x: 3, y: 4 }, { value: 3, x: 4, y: 8 }];
  const programs = await module("llm-tasks", `${bootstrap}\nconst rows = ${JSON.stringify(fixture)};\n${alternatives.join("\n")}\nexport { histogram, regression };`);
  assert.equal(programs.histogram.semanticSpec.layers.length, 1);
  assert.equal(programs.histogram.semanticSpec.layers[0].mark.type, "bar");
  assert.ok(programs.regression.semanticSpec.layers.some(layer => layer.mark.type === "point"));
  assert.equal(programs.regression.semanticSpec.layers.some(layer => layer.mark.type === "bar"), false);
  assert.notDeepEqual(programs.histogram.graphicSpec, programs.regression.graphicSpec);
});

test("the extension JavaScript example creates its target before editing it", async () => {
  const [imports, registration, usage] = await blocks("extension/action-authoring.md");
  // Install the displayed registration module locally under the example's module
  // specifier. Only module resolution changes; the documented action calls do not.
  await writeFile(path.join(directory, "registration.mjs"), `${imports.code}\n${registration.code}\n`);
  const source = usage.code.replace('"ggaction-example-extension"', '"./registration.mjs"');
  const { program } = await module("extension-usage", `${source}\nexport { program };`);
  assert.equal(program.graphicSpec.objects.points.type, "circle");
  assert.equal(program.graphicSpec.objects.points.properties.opacity, 0.5);
  assert.equal(program.trace.children.at(-1).op, "setPointOpacity");
});

test("numeric lines, points with default radius, and bars with default width materialize", () => {
  const base = chart().createCanvas({ width: 400, height: 300, margin: 50 })
    .createData({ values: [{ x: 1, y: 2, category: "A" }, { x: 2, y: 4, category: "B" }] });
  const line = base.createLineMark({ id: "line" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  assert.ok(line.graphicSpec.objects.line.items.length > 0);
  const points = base.createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  assert.equal(points.graphicSpec.objects.points.items.length, 2);
  assert.ok(points.graphicSpec.objects.points.items.every(item => item.properties.radius > 0));
  const bars = base.createBarPlot({ id: "bars", x: "category", y: "y", guides: false });
  assert.equal(bars.graphicSpec.objects.bars.items.length, 2);
  assert.ok(bars.graphicSpec.objects.bars.items.every(item => item.properties.width > 0));
});

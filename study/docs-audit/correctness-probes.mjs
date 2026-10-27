import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chart } from "../../ggaction/src/index.js";
import { documentationCodeBlocks, documentationPrograms } from "../../ggaction/scripts/doc-snippets.js";
import { declaredActionMetadata } from "../../ggaction/scripts/action-card-source.js";
import { docInputs } from "../../ggaction/test/support/docs-inputs.js";

const root = fileURLToPath(new URL("../../ggaction/", import.meta.url));
const read = file => readFileSync(path.join(root, file), "utf8");
function walk(dir) {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const files = walk("docs").filter(file => file.endsWith(".md") &&
  !file.includes("/_sources/") && !file.endsWith("/AGENTS.md") && !file.endsWith("/README.md"));
const blocks = files.flatMap(file => documentationCodeBlocks(read(file)).map(block => ({ file, ...block })));
const inputs = {
  cars: docInputs.cars.cars,
  rows: [{ category: "A", score: 0.3, series: "s" }, { category: "B", score: 0.7, series: "s" }, { category: "C", score: 0.4, series: "s" }],
  intervalRows: [{ year: 2000, lower: 1, upper: 3 }, { year: 2001, lower: 2, upper: 4 }],
  values: docInputs.values.values
};
function run(code) {
  try {
    new Function("chart", ...Object.keys(inputs), code)(chart, ...Object.values(inputs));
    return { ok: true };
  } catch (error) { return { ok: false, message: error.message }; }
}
const missingCanvasExamples = blocks.filter(block =>
  !block.file.includes("/reference/") && ["js", "javascript"].includes(block.language) &&
  /chart\(\)/.test(block.code) && !block.code.includes("createCanvas") &&
  /(?:\.create\w*(?:Mark|Plot|Axis|Legend)|\.encode[A-Z])/.test(block.code)
).map(block => ({
  file: block.file, line: block.line, heading: block.heading, exactCode: block.code,
  original: run(block.code), withCanvasOnly: run(block.code.replace("chart()", "chart().createCanvas()"))
}));
assert.equal(missingCanvasExamples.length, 7);
for (const example of missingCanvasExamples) {
  assert.equal(example.original.message, "Graphical layout requires Canvas dimensions and margin.");
  assert.equal(example.withCanvasOnly.ok, true);
}

const contracts = JSON.parse(read("docs/_data/snippet_contracts.json"));
const programs = await documentationPrograms();
const actions = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json")).actions;
const definitions = new Map((await declaredActionMetadata(actions)).map(definition => [definition.name, definition]));
const abbreviatedSignatures = [];
for (const file of files.filter(file => file.startsWith("docs/api/"))) {
  for (const [index, line] of read(file).split("\n").entries()) {
    const match = line.match(/^#+ `([\w]+)\(\{ ([\w?, ]+) \}/);
    if (!match || !definitions.has(match[1])) continue;
    const shown = match[2].replaceAll("?", "").split(",").map(option => option.trim());
    const omitted = definitions.get(match[1]).options.map(option => option.name).filter(option => !shown.includes(option));
    if (omitted.length) abbreviatedSignatures.push({ file, line: index + 1, action: match[1], omitted });
  }
}
const point = chart().createCanvas().createData({ values: [{ x: 1, y: 2 }] })
  .createPointMark({ stroke: "red" }).encodeX({ field: "x" }).encodeY({ field: "y" });
const time = chart().createData({ values: [{ date: "2024-05-17T13:45:00Z" }] })
  .createTimeUnitData({ id: "month", field: "date", unit: "month" });
const result = {
  snapshot: "202b7afd4146a691c136964c4cc53f9c37444513",
  counts: {
    publicMarkdownPages: files.length,
    jsBlocks: blocks.filter(block => ["js", "javascript"].includes(block.language)).length,
    tsBlocks: blocks.filter(block => ["ts", "typescript"].includes(block.language)).length,
    registeredPrograms: programs.length,
    apiAdvancedExtensionSnippetRecords: contracts.length,
    registeredWithinSnippetRecords: contracts.filter(contract => contract.executable).length
  },
  missingCanvasExamples,
  abbreviatedSignatures,
  defaultChecks: {
    pointWithStrokeOnly: point.graphicSpec.objects.point.items[0].properties,
    timeUnitWithoutAs: time.semanticSpec.datasets.at(-1).values
  }
};
writeFileSync(new URL("./correctness-evidence.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ counts: result.counts, missingCanvasExamples: missingCanvasExamples.length, abbreviatedSignatures: abbreviatedSignatures.length, defaultChecks: result.defaultChecks }, null, 2));

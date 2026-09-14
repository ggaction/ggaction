import { generateDocScaleEditors } from "../../scripts/generate-doc-scale-editors.js";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { publicExamples, DOCUMENTATION_WORKFLOWS, DOCUMENTATION_ONLY_PROGRAMS } from "../../examples/registry.js";
import { readDocChartCatalog } from "../../scripts/doc-chart-catalog.js";
import { publicOptionDeclarations } from "../../scripts/generate-doc-signatures.js";
import { generateDocChartPicker } from "../../scripts/generate-doc-chart-picker.js";
import { generateDocWorkflows } from "../../scripts/generate-doc-workflows.js";
import { generateDocSnippetContracts } from "../../scripts/generate-doc-snippet-contracts.js";
import { buildDocProvenance, generateDocProvenance } from "../../scripts/doc-provenance.js";
import { docsEnvironmentRecommendations, inspectDocsEnvironment } from "../../scripts/check-docs-environment.js";
import { authoringStages } from "../../examples/hierarchical-authoring/program.js";
import { createMissingObservationsWorkflow } from "../../examples/repair-missing-observations/program.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = file => readFile(path.join(root, file), "utf8");

test("covers every maintained chart program or an explicit documentation-only exclusion", async () => {
  const catalog = readDocChartCatalog(await read("docs/_data/chart_examples.yml"));
  const publicDirectories = [...new Set(publicExamples().map(chart => path.basename(path.dirname(fileURLToPath(chart.programFile)))))].sort();
  assert.deepEqual(catalog.map(entry => entry.example.split("/").at(-2)).sort(), publicDirectories);
  const directories = [];
  for (const entry of await readdir(path.join(root, "examples"), { withFileTypes: true })) {
    if (entry.isDirectory() && (await readdir(path.join(root, "examples", entry.name))).includes("program.js")) directories.push(entry.name);
  }
  assert.deepEqual(directories.sort(), [...publicDirectories, ...Object.keys(DOCUMENTATION_ONLY_PROGRAMS)].sort());
  for (const reason of Object.values(DOCUMENTATION_ONLY_PROGRAMS)) assert.ok(reason.length > 20);
});

test("matches the public derived-transform union to its one normative tag table", async () => {
  const source = await read("types/program.d.ts");
  const union = source.match(/export type DatasetTransform =([\s\S]*?);/)[1];
  const declarations = await publicOptionDeclarations();
  function tagsFor(name, seen = new Set()) {
    if (seen.has(name) || !declarations.has(name)) return [];
    seen.add(name);
    const body = declarations.get(name);
    const tag = body.match(/\btype: "([^"]+)"/)?.[1];
    if (tag) return [tag];
    return [...body.matchAll(/\b[A-Z][A-Za-z0-9]+\b/g)].flatMap(([reference]) => tagsFor(reference, seen));
  }
  const tags = [...union.matchAll(/\bDataset\w+Transform\b/g)].map(([name]) => {
    const candidates = [...new Set(tagsFor(name))];
    assert.equal(candidates.length, 1, name); return candidates[0];
  });
  const page = await read("docs/api/data/source-and-derived.md");
  const documented = [...page.matchAll(/^\| `"([A-Za-z0-9]+)"` \|/gm)].map(match => match[1]);
  assert.deepEqual(documented.sort(), tags.sort());
});

test("keeps the chart picker, workflow programs, snippet contracts, and provenance fresh", async () => {
  await generateDocChartPicker({ check: true });
  await generateDocScaleEditors({ check: true });
  await generateDocWorkflows({ check: true });
  await generateDocSnippetContracts({ check: true });
  await generateDocProvenance({ check: true });
  const provenance = await buildDocProvenance();
  assert.equal(provenance.baseline.actionCount, 234);
  assert.equal(Object.keys(provenance.actionAvailability).length, provenance.actionCount);
  const changelog = (await read("CHANGELOG.md")).split("## [0.0.13]")[0];
  for (const [name, availability] of Object.entries(provenance.actionAvailability)) {
    if (availability.introducedAfter) assert.ok(changelog.includes(`\`${name}\``), name);
  }
  const manifest = JSON.parse(await read("docs/llms-manifest.json"));
  assert.equal(manifest.provenance.contractId, provenance.contractId);
  assert.ok((await read("docs/llms-full.txt")).includes(provenance.contractId));
});

test("keeps the hierarchical lesson geometrically equivalent before intentional styling", () => {
  const { highLevel, composed, styled, revisedAgain } = authoringStages();
  assert.deepEqual(highLevel.graphicSpec, composed.graphicSpec);
  assert.deepEqual(highLevel.semanticSpec.datasets, styled.semanticSpec.datasets);
  assert.notDeepEqual(composed.graphicSpec, styled.graphicSpec);
  assert.equal(highLevel.trace.children.at(-1).op, "createScatterPlot");
  assert.ok(highLevel.trace.children.at(-1).children.some(child => child.op === "encodeX"));
  assert.deepEqual(styled.trace.children.slice(0, highLevel.trace.children.length), highLevel.trace.children);
  assert.deepEqual(revisedAgain.trace.children.slice(0, styled.trace.children.length), styled.trace.children);
  assert.ok(styled.graphicSpec.objects.points.items.every(item => item.properties.opacity === 0.35));
  assert.ok(revisedAgain.graphicSpec.objects.points.items.every(item => item.properties.opacity === 0.7));
  const rescaled = revisedAgain.editXScale({ domain: [0, 10] });
  assert.ok(rescaled.graphicSpec.objects.points.items.every(item => item.properties.opacity === 0.7));
});

test("anchors completion, imputation, and window prose to literal expected values", () => {
  const [before, after] = Object.values(createMissingObservationsWorkflow().children);
  const rows = (program, id) => program.semanticSpec.datasets.find(dataset => dataset.id === id).values;
  assert.deepEqual(rows(before, "completeBefore").map(row => row.value), [2, null, 6]);
  assert.deepEqual(rows(before, "imputedBefore").map(row => row.value), [2, 4, 6]);
  assert.deepEqual(rows(before, "windowBefore").map(row => row.mean), [2, 3, 5]);
  assert.deepEqual(rows(after, "windowAfter").map(row => row.mean), [4, 5, 7]);
  assert.equal(before.semanticSpec.layers.find(layer => layer.id === "trend").data, "windowBefore");
  assert.equal(after.semanticSpec.layers.find(layer => layer.id === "trend").data, "windowAfter");
});

test("distinguishes required runtime failures from CI-version recommendations", async () => {
  const ready = { nodeVersion: "22.0.0", rubyVersion: "3.3.12", bundleAvailable: true, chromiumAvailable: true };
  assert.deepEqual(inspectDocsEnvironment(ready), []);
  const pin = (await read(".ruby-version")).trim();
  assert.equal(docsEnvironmentRecommendations(ready, pin).length, 1);
  assert.deepEqual(docsEnvironmentRecommendations({ ...ready, rubyVersion: pin }, pin), []);
  assert.ok(inspectDocsEnvironment({ ...ready, rubyVersion: "2.6.10" }).length > 0);
  assert.deepEqual(docsEnvironmentRecommendations({ ...ready, rubyVersion: "2.6.10" }, pin), []);
  assert.ok((await read(".github/workflows/ci.yml")).includes(`ruby-version: "${pin}"`));
});

test("the resource cleanup recipe demonstrates rejection before dependency-safe removal", async () => {
  const { createResourceRemovalWorkflow } = await import("../../examples/remove-dependent-resources/program.js");
  const [before, after] = Object.values(createResourceRemovalWorkflow().children);
  const snapshot = JSON.stringify(before);
  assert.throws(() => before.removeData({ id: "temporary" }), /preview/);
  assert.equal(JSON.stringify(before), snapshot);
  assert.ok(before.semanticSpec.datasets.some(data => data.id === "temporary"));
  assert.ok(before.semanticSpec.layers.some(layer => layer.id === "preview"));
  assert.equal(after.semanticSpec.datasets.some(data => data.id === "temporary"), false);
  assert.equal(after.semanticSpec.layers.some(layer => layer.id === "preview"), false);
  assert.ok(after.semanticSpec.layers.some(layer => layer.id === "main"));
});

test("Related navigation remains the final section of public documentation", async () => {
  async function visit(directory) {
    for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name === "AGENTS.md") continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.name.endsWith(".md")) {
        const prose = (await read(file)).replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "");
        const related = prose.match(/^## Related[^\n]*\n([\s\S]*)$/m)?.[1];
        if (related) assert.doesNotMatch(related, /^#{2,6}\s|^```/m, file);
      }
    }
  }
  await visit("docs");
});


test("every authoring workflow has exact-code execution metadata and a browser entry", async () => {
  const programs = JSON.parse(await read("docs/_data/snippet_programs.json"));
  const examples = publicExamples();
  assert.equal(new Set(examples.map(example => example.id)).size, examples.length);
  for (const workflow of DOCUMENTATION_WORKFLOWS) {
    const file = path.relative(root, fileURLToPath(workflow.programFile));
    const entries = Object.values(programs).filter(program => program.canonical?.file === file);
    assert.equal(entries.length, 1, workflow.id);
    assert.equal(entries[0].environment, "browser-module");
    assert.ok(workflow.browser?.path, workflow.id);
  }
});

test("example source links resolve to the exact checked-in canonical programs", async () => {
  const provenance = await buildDocProvenance();
  for (const example of publicExamples()) {
    const file = path.relative(root, fileURLToPath(example.programFile));
    const linked = execFileSync("git", ["show", `${provenance.exampleSourceRef}:${file}`], { cwd: root, encoding: "utf8" });
    assert.equal(linked, await read(file), `${example.id} source link points to stale code`);
  }
});

test("weighted distribution recipes preserve mass and separate density from cumulative probability", async () => {
  const { createWeightedDistributionsWorkflow } = await import("../../examples/compare-weighted-distributions/program.js");
  const [histogram, density, ecdf] = Object.values(createWeightedDistributionsWorkflow().children);
  const bars = histogram.graphicSpec.objects.histogram.items;
  assert.deepEqual(bars.map(item => Math.round(item.properties.height * 3 / 170)), [1, 3, 2]);
  const distribution = density.semanticSpec.datasets.find(data => data.id === "densityPlotDensityData").values;
  assert.ok(distribution.every(row => row.value_density >= 0));
  const integral = distribution.slice(1).reduce((sum, row, i) => sum +
    (row.value_value - distribution[i].value_value) * (row.value_density + distribution[i].value_density) / 2, 0);
  assert.ok(integral > 0.999 && integral <= 1.001, `Unit density integral ${integral}`);
  const dataset = ecdf.semanticSpec.datasets.find(data => data.id === "ecdfPlotECDFData");
  const key = dataset.transform[0].as.probability;
  const probabilities = dataset.values.map(row => row[key]);
  for (const [i, expected] of [0, 1 / 6, 4 / 6, 1].entries()) assert.ok(Math.abs(probabilities[i] - expected) < 1e-12);
  assert.equal(ecdf.graphicSpec.objects.yAxisTitle.properties.text, "Cumulative probability");
});

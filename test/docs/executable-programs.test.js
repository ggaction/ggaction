import { assertEquivalentMeaning } from "../support/identity-equivalence.js";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { documentationPrograms, copyDocumentationSupportFiles } from "../../scripts/doc-snippets.js";
import { assertDocumentationRendering, documentationEnvironment } from "../support/docs-runtime.js";
import { docInputs, datasetValues } from "../support/docs-inputs.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const directory = path.join(root, ".artifacts/test/docs/programs");
await mkdir(directory, { recursive: true });

for (const example of await documentationPrograms()) {
  test(`executes documented ${example.file} [${example.id ?? "primary"}] against its stated inputs`, async t => {
    let passed = false;
    const started = performance.now();
    t.after(async () => writeFile(path.join(directory, example.file.replaceAll("/", "-") + (example.id ?? "primary") + ".json"), JSON.stringify({ id: example.id ?? example.file, file: example.file, sha256: example.sha256, rendering: example.rendering, status: passed ? "passed" : "failed", durationMs: performance.now() - started }, null, 2)));
    const fixture = example.fixture ? docInputs[example.fixture] : {};
    assert.ok(fixture, `Unknown fixture ${example.fixture}`);
    const data = example.dataset ? datasetValues(example.dataset) : undefined;
    const prefix = [
      `import { documentationEnvironment } from ${JSON.stringify(new URL("../support/docs-runtime.js", import.meta.url).href)};`,
      `const __documentationEnvironment = documentationEnvironment(${JSON.stringify({ environment: example.environment, dataset: example.dataset })}, ${JSON.stringify(data)});`,
      'const { document, fetch, createImageBitmap } = __documentationEnvironment;',
      ...Object.entries(fixture).map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`),
      ...(example.importChart ? ['import { chart } from "ggaction";'] : [])
    ].join("\n");
    const resultNames = example.result.split(",").map(value => value.trim());
    const moduleDirectory = path.join(directory, example.file.replaceAll("/", "-") + (example.id ?? ""));
    await mkdir(moduleDirectory, { recursive: true });
    await copyDocumentationSupportFiles(example, moduleDirectory);
    const moduleFile = path.join(moduleDirectory, "main.mjs");
    await writeFile(moduleFile, `${prefix}\n${example.code}\nexport { ${resultNames.join(", ")}, __documentationEnvironment };\n`);
    const result = await import(pathToFileURL(moduleFile));
    for (const name of resultNames) {
      const program = result[name];
      assert.ok(program?.semanticSpec, `${name} must be a program`);
      if (example.resultKind === "semantic") {
        assert.ok(program.semanticSpec.resources.length > 0, `${name} must own semantic resources`);
        assert.equal(Object.keys(program.graphicSpec.objects).length, 0, `${name} must create no graphics`);
        continue;
      }
      assert.ok(program?.graphicSpec?.objects?.canvas, `${name} must own a Canvas`);
      assert.ok(Object.values(program.graphicSpec.objects).some(object =>
        (object.items?.length ?? 0) > 0 || ["line", "path", "circle", "rect", "text", "weighted-blend"].includes(object.type)
      ), `${name} must materialize visible content`);
    }
    assertDocumentationRendering(example, result.__documentationEnvironment.canvas);
    if (example.expect) {
      for (const name of resultNames) assert.equal(result[name].graphicSpec.objects[example.expect.mark]?.items?.length, example.expect.items, `${name} documented mark cardinality`);
    }
    if (example.canonical) {
      const { file, exported, input } = example.canonical;
      const canonical = await import(pathToFileURL(path.join(root, file)));
      const expected = canonical[exported](input ? datasetValues(input) : undefined);
      assertEquivalentMeaning(result[resultNames.at(-1)].graphicSpec, expected.graphicSpec,
        "The displayed complete program must match its canonical example.");
    }
    passed = true;
  });
}

test("marks tutorial and recipe snippets with explicit execution contracts", async () => {
  const registry = JSON.parse(await readFile(path.join(root, "docs/_data/snippet_programs.json"), "utf8"));
  assert.ok(Object.keys(registry).length >= 35);
  for (const [file, example] of Object.entries(registry)) {
    assert.ok(example.mode === "complete" || example.mode === "continuation", file);
    assert.ok(typeof example.prerequisites === "string" && example.prerequisites.length > 15, file);
  }
});

 test("prepares a distinct packed consumer source for every registered snippet", async () => {
  const { prepareTutorials } = await import("../../scripts/tutorial-consumer.js");
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-snippet-identity-"));
  try {
    const programs = await documentationPrograms();
    const { inputs, consumers } = await prepareTutorials(temporary);
    assert.equal(Object.keys(inputs).length, programs.length);
    assert.equal(new Set(consumers.map(item => item.name)).size, programs.length);
    for (const [index, consumer] of consumers.entries()) {
      const source = await readFile(path.join(temporary, "tutorials", consumer.name, "main.js"), "utf8");
      assert.ok(source.includes(programs[index].code), consumer.name);
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test("extracts long and indented fences without closing on shorter embedded fences", async () => {
 const { documentationCodeBlocks } = await import("../../scripts/doc-snippets.js");
 for (const opening of ["````js", "  ```js", '```js title="example"']) {
  const fence=opening.trim().match(/`+/)[0];
  assert.equal(documentationCodeBlocks(`${opening}\nconst x = 1;\n${fence}`)[0].code,"const x = 1;");
 }
 assert.equal(documentationCodeBlocks("````js\n```\n````")[0].code,"```");
});


test("documentation mocks reject incorrect URLs/selectors and missing rendering", async () => {
  const example = { environment: "browser-module", dataset: "cars", rendering: "renders-canvas" };
  const environment = documentationEnvironment(example, []);
  assert.throws(() => environment.document.querySelector("#wrong"), /Undocumented Canvas selector/);
  assert.throws(() => environment.document.createElement("script"), /Undocumented element/);
  assert.notEqual(environment.document.createElement("canvas"), environment.canvas);
  await assert.rejects(environment.createImageBitmap({}), /requires a Blob/);
  await assert.rejects(environment.fetch("/wrong.json"), /documented dataset URL/);
  assert.throws(() => assertDocumentationRendering(example, environment.canvas), /must render/);
  environment.canvas.width = environment.canvas.height = 10;
  assert.throws(() => assertDocumentationRendering(example, environment.canvas), /uniform background/);
  assert.equal(documentationEnvironment({ environment: "node-esm" }).document, undefined);
});

test("snippet execution evidence must match the current code hash and pass status", async () => {
  const { snippetExecutionSummary } = await import("../../scripts/doc-snippet-coverage.js");
  const record = { id: "docs/example.md#example:1", file: "docs/example.md", sha256: "current", executable: true, generated: false };
  const receipt = { id: "example", file: "example.md", sha256: "current", status: "passed" };
  assert.equal(snippetExecutionSummary([record], [receipt]).observedPassing, 1);
  assert.equal(snippetExecutionSummary([record], [{ ...receipt, sha256: "stale" }]).observedPassing, 0);
  assert.equal(snippetExecutionSummary([record], [{ ...receipt, status: "failed" }]).observedPassing, 0);
  assert.equal(snippetExecutionSummary([record], []).registered, 1);
  assert.equal(snippetExecutionSummary([record], []).observedPassing, 0);
});

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { documentationPrograms } from "../../scripts/doc-snippets.js";
import { docInputs, datasetValues } from "../support/docs-inputs.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const directory = path.join(root, ".artifacts/test/docs/programs");
await mkdir(directory, { recursive: true });

for (const example of await documentationPrograms()) {
  test(`executes documented ${example.file} against its stated inputs`, async () => {
    const fixture = example.fixture ? docInputs[example.fixture] : {};
    assert.ok(fixture, `Unknown fixture ${example.fixture}`);
    const data = example.dataset ? datasetValues(example.dataset) : undefined;
    const prefix = [
      'import { createCanvas as nativeCanvas } from "@napi-rs/canvas";',
      'const canvas = nativeCanvas(1, 1);',
      'const document = { querySelector: () => canvas };',
      ...(data ? [`const fetch = async () => ({ ok: true, status: 200, json: async () => ${JSON.stringify(data)} });`] : []),
      ...Object.entries(fixture).map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`),
      ...(example.importChart ? ['import { chart } from "ggaction";'] : [])
    ].join("\n");
    const resultNames = example.result.split(",").map(value => value.trim());
    const moduleFile = path.join(directory, example.file.replaceAll("/", "-") + ".mjs");
    await writeFile(moduleFile, `${prefix}\n${example.code}\nexport { ${resultNames.join(", ")} };\n`);
    const result = await import(pathToFileURL(moduleFile));
    for (const name of resultNames) {
      const program = result[name];
      assert.ok(program?.semanticSpec, `${name} must be a program`);
      assert.ok(program?.graphicSpec?.objects?.canvas, `${name} must own a Canvas`);
      assert.ok(Object.values(program.graphicSpec.objects).some(object =>
        (object.items?.length ?? 0) > 0 || ["line", "path", "circle", "rect", "text"].includes(object.type)
      ), `${name} must materialize visible content`);
    }
    if (example.canonical) {
      const { file, exported, input } = example.canonical;
      const canonical = await import(pathToFileURL(path.join(root, file)));
      const expected = canonical[exported](input ? datasetValues(input) : undefined);
      assert.deepEqual(result[resultNames.at(-1)].graphicSpec, expected.graphicSpec,
        "The displayed complete program must match its canonical example.");
    }
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

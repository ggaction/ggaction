import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { actionSourceRoot } from "../../scripts/action-knowledge.js";
import { buildKnowledge, generateActionKnowledge } from "../../scripts/generate-action-knowledge.js";
import { actionExamples } from "../llm/action-knowledge-examples.js";

async function json(relative) {
  return JSON.parse(await readFile(new URL(`../../${relative}`, import.meta.url), "utf8"));
}

function traceIncludes(node, action) {
  return node?.op === action || (node?.children ?? []).some(child =>
    traceIncludes(child, action)
  );
}

test("publishes complete deterministic action knowledge", async () => {
  const [{ document, actionDocument, report }, generated, published] = await Promise.all([
    buildKnowledge(),
    json("knowledge/index.json"),
    json("docs/llms-actions.json")
  ]);

  assert.deepEqual(report, {
    actions: 173,
    domains: 11,
    parameterNotes: 443,
    actionExamples: { canonical: 72, focused: 100, "not-applicable": 1 },
    recipes: 33,
    recipeActions: 173,
    recipeExamples: { canonical: 22, focused: 11 },
    classifications: { primary: 32, supporting: 67, lifecycle: 71, "extension-only": 3 }
  });
  assert.deepEqual(generated, document);
  assert.deepEqual(published, actionDocument);
  assert.equal(document.recipes.length, 33);
  assert.deepEqual(
    document.actions.map(action => action.name),
    document.actions.map(action => action.name).toSorted()
  );
  for (const hash of Object.values(document.generated).filter(value =>
    typeof value === "string"
  )) {
    assert.match(hash, /^[a-f0-9]{64}$/);
  }
  await generateActionKnowledge({ check: true });
});

test("keeps canonical action sources informative and schema-shaped", async () => {
  const files = (await readdir(actionSourceRoot))
    .filter(file => file.endsWith(".json"))
    .sort();
  assert.equal(files.length, 11);

  const documents = await Promise.all(files.map(async file =>
    JSON.parse(await readFile(new URL(`../../knowledge/actions/${file}`, import.meta.url), "utf8"))
  ));
  const actions = documents.flatMap(document => document.actions);
  assert.equal(actions.length, 173);
  assert.equal(new Set(actions.map(action => action.name)).size, 173);
  assert.equal(new Set(actions.map(action => action.summary)).size, 173);

  for (const [file, document] of files.map((file, index) => [file, documents[index]])) {
    assert.equal(document.schemaVersion, 1);
    assert.equal(document.domain, file.replace(/\.json$/, ""));
    assert.match(document.domain, /^[a-z][a-z0-9_-]*$/);
    for (const action of document.actions) {
      assert.equal(action.summary.length >= 20, true, action.name);
      assert.equal(action.useWhen.length > 0, true, action.name);
      assert.equal(action.avoidWhen.length > 0, true, action.name);
      assert.equal(action.commonErrors.length > 0, true, action.name);
      assert.equal(action.docs.length > 0, true, action.name);
      assert.equal(action.recipeIds.length > 0, true, action.name);
      assert.doesNotMatch(action.summary, /\b(?:Createss|Editss)\b|matrix above/i);
    }
  }
});

test("executes every focused example and records its intended action", () => {
  assert.equal(Object.keys(actionExamples).length, 100);
  for (const [name, createProgram] of Object.entries(actionExamples)) {
    const program = createProgram();
    assert.ok(program.semanticSpec, name);
    assert.ok(program.graphicSpec, name);
    assert.equal(traceIncludes(program.trace, name), true, name);
  }
});

test("routes LLM readers to the public structured action document", async () => {
  const router = await readFile(new URL("../../docs/llms/actions.md", import.meta.url), "utf8");
  const schema = await json("test/llm/action-knowledge.schema.json");
  assert.match(router, /\[complete machine-readable action metadata\]\(\.\.\/llms-actions\.json\)/);
  assert.equal(schema.properties.domain.pattern, "^[a-z][a-z0-9_-]*$");
});

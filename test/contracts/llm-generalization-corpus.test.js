import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  frozenAdaptationPolicy,
  loadGeneralizationCorpus,
  validateGeneralizationCorpusStructure,
  validateGeneralizationManifest
} from "../../scripts/llm-eval/paired-corpus.js";
import { supportsProgramValidation } from "../../scripts/llm-eval/program-evaluator.js";

async function fixtures() {
  const loaded = await loadGeneralizationCorpus();
  const [historicalCorpus, actionIndex, manifest] = await Promise.all([
    readFile(new URL("../llm/tasks.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../agent_docs/contract/ACTION_INDEX.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../llm/generalization-corpus-manifest.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  const datasetEvidence = Object.fromEntries(Object.entries(loaded.corpus.datasets).map(([id, dataset]) => [id, {
    sha256: dataset.sha256,
    fields: dataset.fields
  }]));
  return { loaded, historicalCorpus, actionIndex, manifest, datasetEvidence };
}

test("freezes a disjoint and executable generalization corpus", async () => {
  const { loaded, manifest } = await fixtures();
  assert.equal(loaded.corpus.tasks.length, 17);
  assert.equal(loaded.corpus.adaptationPolicy, frozenAdaptationPolicy);
  assert.equal(new Set(loaded.corpus.tasks.map(task => task.category)).size >= 10, true);
  assert.equal(validateGeneralizationManifest(manifest, loaded), true);
});

test("keeps every historical and generalization validation in the strict oracle vocabulary", async () => {
  const { loaded, historicalCorpus } = await fixtures();
  for (const task of [...historicalCorpus.tasks, ...loaded.corpus.tasks]) {
    assert.deepEqual(task.oracle.requiredValidations.filter(id => !supportsProgramValidation(id)), []);
  }
  assert.equal(supportsProgramValidation("graphic:any-ink"), false);
});

test("rejects corpus adaptation and historical leakage", async () => {
  const { loaded, historicalCorpus, actionIndex, datasetEvidence } = await fixtures();
  const validate = corpus => validateGeneralizationCorpusStructure({
    corpus,
    historicalCorpus,
    actionNames: actionIndex.actions.map(action => action.name),
    datasetEvidence
  });
  const adapted = structuredClone(loaded.corpus);
  adapted.adaptationPolicy = "Tune until it passes.";
  assert.throws(() => validate(adapted), /adaptation policy/u);

  const leaked = structuredClone(loaded.corpus);
  leaked.tasks[0].id = historicalCorpus.tasks[0].id;
  assert.throws(() => validate(leaked), /historical task ID/u);

  const renderingLeak = structuredClone(loaded.corpus);
  renderingLeak.tasks[0].oracle.requiredRuntimeFunctions.push("render");
  assert.throws(() => validate(renderingLeak), /leave rendering to the evaluator/u);
});
